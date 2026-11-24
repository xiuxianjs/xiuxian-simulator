import { getBackendConfig } from "../api/bot/config.js";
import { observeChatContacts } from "../api/bot/chat.js";
import { ChatContactOutbox } from "./chatContactOutbox.js";
import { logger } from "alemonjs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

//#region src/notification/chatContacts.ts
const CACHE_TTL = 6e5;
const CACHE_LIMIT = 5e3;
const keyOf = (item) => JSON.stringify([item.botId, item.openId]);
/** Memory caches acknowledgements. Observations are queued for ordered disk
* writes and sent to the backend in batches after persistence. */
var ChatContactObserver = class {
	send;
	now;
	groups = /* @__PURE__ */ new Map();
	contacts = /* @__PURE__ */ new Map();
	timer;
	scheduledAt = 0;
	running = false;
	disposed = false;
	retryDelay = 1e3;
	retryAt = 0;
	outbox;
	constructor(send = observeChatContacts, now = Date.now, directory = resolve("data/robot-chat-outbox")) {
		this.send = send;
		this.now = now;
		this.outbox = new ChatContactOutbox(directory);
	}
	start() {
		this.schedule(250);
	}
	snapshot() {
		return [...this.contacts.values()].filter((item) => this.now() - item.cachedAt < CACHE_TTL).map((item) => ({ ...item }));
	}
	snapshotGroups() {
		return [...this.groups.values()].filter((item) => this.now() - item.cachedAt < CACHE_TTL).map((item) => ({ ...item }));
	}
	async observe(event) {
		if (event.name !== "message.create" && event.name !== "private.message.create" && event.name !== "private.interaction.create" && event.name !== "interaction.create" && event.name !== "private.friend.add" && event.name !== "private.friend.remove" && event.name !== "member.add" && event.name !== "member.remove" && event.name !== "guild.join" && event.name !== "guild.exit" && event.name !== "private.notice.create" && event.name !== "notice.create") return;
		if (this.disposed || event.Platform !== "qq-bot" || event.IsBot) return;
		const botId = event.Target?.BotId ?? event.BotId;
		const raw = event.value && typeof event.value === "object" ? event.value : {};
		const permission = (event.name === "private.notice.create" || event.name === "notice.create") && event.Notice?.type === "message-permission" ? event.Notice.enabled : void 0;
		const friend = event.name === "private.friend.add" || event.name === "private.friend.remove" || typeof permission === "boolean";
		const message = event.name === "message.create" || event.name === "private.message.create" || event.name === "private.interaction.create" || event.name === "interaction.create";
		const groupMember = event.name === "member.add" || event.name === "member.remove";
		const groupLifecycle = event.name === "guild.join" || event.name === "guild.exit";
		if (!friend && !message && !groupMember && !groupLifecycle) return;
		const scope = event.Target?.scope;
		const groupPermission = scope === "group" && typeof permission === "boolean";
		let kind;
		let openId;
		if (groupPermission) {
			kind = permission ? "group_allow" : "group_block";
			openId = "";
		} else if (groupLifecycle && scope === "group") {
			kind = event.name === "guild.exit" ? "group_exit" : "group_join";
			openId = "";
		} else if (friend || message && scope === "c2c") {
			kind = event.name === "private.friend.remove" || permission === false ? "removed" : "private";
			openId = scope === "c2c" ? event.Target?.targetId : event.DirectUserId ?? (typeof raw.openid === "string" ? raw.openid : event.UserId);
		} else if (scope === "group" && (message || groupMember)) {
			kind = event.name === "member.remove" ? "group_leave" : "group";
			openId = groupMember ? event.MemberId : event.DirectUserId ?? event.UserId;
		} else return;
		if (!botId || !openId && !groupLifecycle && !groupPermission) return;
		const knownTime = Number.isSafeInteger(event.OccurredAt) && (event.OccurredAt ?? 0) > 0;
		const item = {
			botId,
			openId: openId ?? "",
			bid: kind === "group" && !groupMember ? event.UserId ?? openId ?? "" : openId ?? "",
			kind,
			occurredAt: knownTime ? event.OccurredAt : this.now(),
			groupSeen: kind === "group",
			timeUnknown: !knownTime,
			...scope === "group" ? {
				groupId: event.Target?.targetId,
				memberId: groupLifecycle || groupPermission ? "" : groupMember ? event.MemberId : event.UserId
			} : {},
			...kind === "group" && !groupMember && event.DirectUserId && event.UserId && event.DirectUserId !== event.UserId ? { aliasId: event.UserId } : {}
		};
		const cached = this.contacts.get(keyOf(item));
		if (cached && (kind === "private" || kind === "removed") && (item.occurredAt < cached.relationAt || item.occurredAt === cached.relationAt && (kind !== "removed" || cached.relationState !== 2))) return;
		await this.outbox.put(item);
		const cachedGroup = item.groupId && this.groups.has(JSON.stringify([item.botId, item.groupId]));
		this.schedule((cached || cachedGroup) && !friend && !groupMember && !groupLifecycle ? 5e3 : 250);
	}
	schedule(delay) {
		if (this.running || this.disposed) return;
		const now = Date.now();
		const due = Math.max(now + delay, this.retryAt);
		if (this.timer && this.scheduledAt <= due) return;
		if (this.timer) clearTimeout(this.timer);
		this.scheduledAt = due;
		this.timer = setTimeout(() => {
			this.timer = void 0;
			this.flush();
		}, due - now);
		this.timer.unref?.();
	}
	async flush() {
		if (this.running || this.disposed) return;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = void 0;
		}
		this.running = true;
		let delay = 5e3;
		const scanStarted = performance.now();
		let scanMs;
		let batchSize;
		let fileCount;
		let requestStarted;
		let requestMs;
		let phase = "scan";
		try {
			const { entries: batch, fileCount: pendingFiles } = await this.outbox.batch();
			scanMs = Math.round(performance.now() - scanStarted);
			batchSize = batch.length;
			fileCount = pendingFiles;
			if (!batch.length || this.disposed) return;
			phase = "request";
			requestStarted = performance.now();
			const result = await this.send(batch.map((entry) => entry.item));
			requestMs = Math.round(performance.now() - requestStarted);
			phase = "receipt";
			if (!Array.isArray(result?.items) || result.items.length !== batch.length) throw new Error("好友感知回执不完整");
			phase = "acknowledge";
			await this.outbox.acknowledge(batch);
			for (const { item } of batch) {
				if (item.kind === "group_exit" || item.kind === "group_join") this.contacts.clear();
				if (item.aliasId) this.contacts.delete(keyOf({
					botId: item.botId,
					openId: item.aliasId
				}));
			}
			for (const item of result.items) {
				if (!item.openId) continue;
				const key = keyOf(item);
				this.contacts.delete(key);
				this.contacts.set(key, {
					...item,
					cachedAt: this.now()
				});
			}
			while (this.contacts.size > CACHE_LIMIT) this.contacts.delete(this.contacts.keys().next().value);
			for (const group of result.groups ?? []) {
				const key = JSON.stringify([group.botId, group.groupId]);
				this.groups.delete(key);
				this.groups.set(key, {
					...group,
					cachedAt: this.now()
				});
			}
			while (this.groups.size > CACHE_LIMIT) this.groups.delete(this.groups.keys().next().value);
			this.retryDelay = 1e3;
			this.retryAt = 0;
			delay = 250;
		} catch (error) {
			delay = Math.round(this.retryDelay * (.75 + Math.random() * .25));
			this.retryAt = Date.now() + delay;
			this.retryDelay = Math.min(6e4, this.retryDelay * 2);
			const failedAt = performance.now();
			logger.warn("好友状态异步上报失败，磁盘待同步记录保留并退避重试", {
				phase,
				batchSize,
				fileCount,
				scanMs: scanMs ?? Math.round(failedAt - scanStarted),
				requestMs: requestMs ?? (requestStarted === void 0 ? void 0 : Math.round(failedAt - requestStarted)),
				retryDelayMs: delay,
				error
			});
		} finally {
			this.running = false;
			this.schedule(delay);
		}
	}
	async dispose() {
		this.disposed = true;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = void 0;
		}
		await this.outbox.idle();
		this.contacts.clear();
		this.groups.clear();
	}
};
let observer = new ChatContactObserver();
const observeChatContact = (event) => {
	observer.observe(event).catch((error) => logger.error("好友状态记录落盘失败", error));
};
const cachedChatContacts = () => observer.snapshot();
const resetChatContactObserver = async () => {
	await observer.dispose();
	const config = getBackendConfig();
	const directory = config.channelMode || config.scope !== config.url ? resolve("data/robot-chat-outbox", `${config.channelMode ? "channel" : "backend"}-${createHash("sha256").update(JSON.stringify([config.scope, config.channelBotId])).digest("hex").slice(0, 24)}`) : resolve("data/robot-chat-outbox");
	observer = new ChatContactObserver(void 0, Date.now, directory);
	observer.start();
};
const stopChatContactObserver = () => observer.dispose();
const cachedChatGroups = () => observer.snapshotGroups();

//#endregion
export { ChatContactObserver, cachedChatContacts, cachedChatGroups, observeChatContact, resetChatContactObserver, stopChatContactObserver };