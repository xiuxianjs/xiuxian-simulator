import { measureTransportStage } from "../utils/transportTiming.js";
import { acquirePlatformPermissionProbe, compareAndSetPlatformPermission, readNotificationGroupSnapshot, readPlatformAvailability, readPlatformPermission, readPlatformPrivateTarget, recordPlatformPermissionEvent, recordPlatformPermissionFailure, refreshNotificationGroupSnapshot, rememberPlatformPrivateTarget } from "../api/bot/notification-cache.js";
import { NotificationDeliveryUncertainError } from "../types/notification.js";
import { bufferFlyMailSend } from "./flymailBuffer.js";
import { MessageDirect, Ok, logger, useGuild } from "alemonjs";
import { createHash } from "crypto";

//#region src/notification/channel.ts
const PERMISSION_TTL_SECONDS = 300;
const PERMISSION_QUERY_INTERVAL_SECONDS = 60;
const CHANNEL_RETRY_SECONDS = 30;
const REQUEST_TIMEOUT_MS = 3e4;
const notificationTargetKey = (target) => createHash("sha256").update(JSON.stringify([
	target.platform,
	target.BotId ?? "",
	target.scope,
	target.targetId
])).digest("hex");
const rawStates = /* @__PURE__ */ new WeakMap();
async function withNotificationTimeout(dispatch, timeout = REQUEST_TIMEOUT_MS) {
	let timer;
	try {
		return await Promise.race([dispatch(), new Promise((_, reject) => {
			timer = setTimeout(() => reject(/* @__PURE__ */ new Error("通知平台请求超时")), timeout);
		})]);
	} finally {
		clearTimeout(timer);
	}
}
function assertNotificationReceipt(results) {
	if (!Array.isArray(results) || results.length === 0 || results.some((result) => result?.code !== Ok)) {
		if (!Array.isArray(results) || results.length === 0 || results.some((result) => typeof result?.code !== typeof Ok || result?.code === Ok)) throw new NotificationDeliveryUncertainError(`通知平台回执缺失或部分成功: ${JSON.stringify(results ?? null)?.slice(0, 2e3)}`);
		throw new Error(`通知投递失败: ${JSON.stringify(results ?? null)?.slice(0, 2e3)}`);
	}
}
async function readNotificationChannel(target) {
	const { state, raw } = await readPlatformPermission(target);
	if (state) rawStates.set(state, raw);
	return state;
}
async function compareAndSetState(target, previous, value, ttl) {
	await compareAndSetPlatformPermission(target, previous ?? "", value, ttl);
}
const groupSnapshots = /* @__PURE__ */ new Map();
const probes = /* @__PURE__ */ new Map();
async function queryNotificationPermission(target) {
	const key = notificationTargetKey(target);
	let state = "unknown";
	try {
		const [guild] = useGuild({
			Platform: target.platform,
			BotId: target.BotId,
			Target: target
		});
		const result = await withNotificationTimeout(() => guild.botInfo(), 1e4);
		if (result.code === Ok && result.data) {
			if (groupSnapshots.size >= 1e3) {
				const oldest = groupSnapshots.keys().next().value;
				if (oldest) groupSnapshots.delete(oldest);
			}
			groupSnapshots.set(key, {
				data: result.data,
				updatedAt: Date.now()
			});
		}
		if (result.code === Ok && typeof result.data?.allowsProactiveMessages === "boolean") state = result.data.allowsProactiveMessages ? "allowed" : "blocked";
		else logger.warn("通知群权限无法确认", {
			target,
			result
		});
	} catch (error) {
		logger.warn("通知群权限查询失败", {
			target,
			error
		});
	}
	return state;
}
async function refreshNotificationPermission(target) {
	if (target.platform !== "qq-bot" || target.scope !== "group") return await readNotificationChannel(target);
	const key = notificationTargetKey(target);
	const existing = probes.get(key);
	if (existing) return await existing;
	const probe = async () => {
		const { previous, acquired } = await acquirePlatformPermissionProbe(target);
		if (!acquired) return await readNotificationChannel(target);
		const state = await queryNotificationPermission(target);
		await compareAndSetState(target, previous, {
			state,
			source: "query",
			updatedAt: Date.now()
		}, state === "unknown" ? 60 : 300);
		return await readNotificationChannel(target);
	};
	const pending = probe();
	probes.set(key, pending);
	try {
		return await pending;
	} finally {
		probes.delete(key);
	}
}
const notificationChannel = {
	async read(target) {
		const availability = await readPlatformAvailability(target);
		if (availability?.available === false) return {
			state: "blocked",
			source: "event",
			updatedAt: availability.updatedAt
		};
		return await readNotificationChannel(target);
	},
	async refreshAfterFailure(target) {
		const availability = await readPlatformAvailability(target);
		if (availability?.available === false) return {
			state: "blocked",
			source: "event",
			updatedAt: availability.updatedAt
		};
		return await refreshNotificationPermission(target);
	},
	async recordFailure(target) {
		await recordPlatformPermissionFailure(target);
	},
	async send(target, data, previous) {
		return await bufferFlyMailSend(target, data, (content) => sendNotificationNow(target, content, previous));
	}
};
async function sendNotificationNow(target, data, previous) {
	if (process.env.login && process.env.login !== target.platform) throw new Error(`通知目标平台与当前适配器不一致: ${target.platform}`);
	if ((await notificationChannel.read(target))?.state === "blocked") throw new Error("通知通道已关闭或失效");
	const direct = MessageDirect.create();
	assertNotificationReceipt(await measureTransportStage("notification.platform.send", () => withNotificationTimeout(() => {
		if (target.platform === "qq-bot") return direct.sendToTarget({
			target,
			format: data
		});
		if (target.platform === "onebot") return target.scope === "group" ? direct.sendToChannel({
			SpaceId: target.targetId,
			BotId: target.BotId,
			format: data
		}) : direct.sendToUser({
			OpenID: target.targetId,
			BotId: target.BotId,
			format: data
		});
		throw new Error(`不支持的通知平台: ${target.platform}`);
	})).catch((error) => {
		throw new NotificationDeliveryUncertainError("通知平台发送结果不确定", { cause: error });
	}));
	await compareAndSetState(target, previous ? rawStates.get(previous) ?? JSON.stringify(previous) : null, {
		state: "allowed",
		source: "receipt",
		updatedAt: Date.now()
	}, 300).catch((error) => logger.error("通知成功状态缓存失败", error));
}
/** 保存真正出现过的私聊地址，避免将 QQ member_openid 当作 user_openid。 */
async function rememberNotificationTarget(event) {
	const target = event.Target;
	const platform = String(event.Platform);
	const botId = target?.BotId ?? event.BotId;
	const isPrivate = event.IsPrivate ?? ("isPrivate" in event && event.isPrivate);
	let privateTarget;
	if (target && ["c2c", "direct"].includes(target.scope)) privateTarget = {
		...target,
		platform,
		BotId: botId
	};
	else if ("DirectUserId" in event && event.DirectUserId) privateTarget = {
		platform,
		BotId: botId,
		scope: "c2c",
		targetId: String(event.DirectUserId)
	};
	else if (isPrivate && "UserId" in event && event.UserId && platform === "onebot") privateTarget = {
		platform,
		BotId: botId,
		scope: "c2c",
		targetId: event.UserId
	};
	if (privateTarget && "UserId" in event && event.UserId) await rememberPlatformPrivateTarget(platform, event.UserId, privateTarget);
}
async function getNotificationPrivateTarget(platform, bid, botId) {
	return await readPlatformPrivateTarget(platform, bid, botId);
}
async function handleNotificationPermissionEvent(event) {
	if (event.Platform !== "qq-bot" || event.Notice?.type !== "message-permission" || !event.Target) return;
	const target = {
		...event.Target,
		platform: event.Platform,
		BotId: event.Target.BotId ?? event.BotId
	};
	const occurredAt = event.OccurredAt;
	const observedOnly = !Number.isSafeInteger(occurredAt) || (occurredAt ?? 0) <= 0;
	await recordPlatformPermissionEvent(target, event.Notice.enabled, observedOnly ? Date.now() : occurredAt, observedOnly);
	await rememberNotificationTarget(event);
}
async function describeNotificationGroup(target, memberId, supplied) {
	if (target.platform !== "qq-bot" || target.scope !== "group") return [];
	let overview = supplied === void 0 ? await readNotificationGroupSnapshot(target, memberId, true) : supplied ?? {
		permission: null,
		availability: null,
		member: null,
		previous: "",
		acquired: false
	};
	if (supplied === void 0 && overview.acquired) {
		const state = await queryNotificationPermission(target);
		overview = await refreshNotificationGroupSnapshot(target, memberId, overview.previous, {
			state,
			source: "query",
			updatedAt: Date.now()
		}, state === "unknown" ? 60 : 300);
	}
	const { permission, availability, member } = overview;
	const snapshot = groupSnapshots.get(notificationTargetKey(target));
	const data = snapshot && Date.now() - snapshot.updatedAt < 300 * 1e3 ? snapshot.data : void 0;
	const lines = [
		`群主动推送：${permission?.state === "allowed" ? "已允许（最近状态）" : permission?.state === "blocked" ? "已关闭" : "暂时无法确认"}`,
		`消息接收模式：${{
			all: "全部消息",
			only_mention: "仅接收 @ 机器人的消息",
			mention_and_context: "@ 及相关上下文消息"
		}[data?.receiveMode ?? ""] ?? "暂时无法确认"}`,
		`机器人角色：${{
			admin: "管理员",
			owner: "群主",
			member: "普通成员"
		}[data?.role ?? ""] ?? "暂时无法确认"}`
	];
	if (availability?.available === false) lines.push("机器人已离开该群，群投递暂停。");
	if (member?.available === false) lines.push("已记录你离开该群，原群投递暂停。");
	if (data?.receiveMode === "only_mention" || data?.receiveMode === "mention_and_context") lines.push("发送指令前请先 @ 机器人。");
	return lines;
}

//#endregion
export { CHANNEL_RETRY_SECONDS, PERMISSION_QUERY_INTERVAL_SECONDS, PERMISSION_TTL_SECONDS, assertNotificationReceipt, describeNotificationGroup, getNotificationPrivateTarget, handleNotificationPermissionEvent, notificationChannel, notificationTargetKey, readNotificationChannel, refreshNotificationPermission, rememberNotificationTarget, withNotificationTimeout };