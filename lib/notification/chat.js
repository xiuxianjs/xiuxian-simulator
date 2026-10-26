import { getAppConfig } from "../utils/appConfig.js";
import { claimNextChatNotice, finishChatNotice } from "../api/bot/chat.js";
import { notificationChannel, withNotificationTimeout } from "./channel.js";
import { Ok, getConfigValue, logger, useMessage } from "alemonjs";

//#region src/notification/chat.ts
/** One native Markdown body, without templates, inherited reply IDs or splitting. */
async function sendChatNotice(claim) {
	const receipt = {
		noticeId: claim.noticeId,
		contactId: claim.contactId,
		botId: claim.botId,
		token: claim.token,
		status: "unknown",
		messageId: "",
		error: ""
	};
	if (getAppConfig()?.close_proactive_message) return {
		...receipt,
		status: "skipped",
		error: "机器人主动消息总开关已关闭"
	};
	if (claim.scope && claim.scope !== "c2c" && claim.scope !== "group" || claim.scope === "group" && claim.mode === "wakeup") return {
		...receipt,
		status: "skipped",
		error: "不支持的投递场景；群消息不使用私聊召回"
	};
	const target = {
		platform: "qq-bot",
		scope: claim.scope ?? "c2c",
		targetId: claim.openId,
		BotId: claim.botId
	};
	try {
		if ((await notificationChannel.read(target))?.state === "blocked") return {
			...receipt,
			status: "skipped",
			error: "平台事件记录表明用户已拒收或好友关系失效"
		};
		const [message] = useMessage({
			Platform: "qq-bot",
			BotId: claim.botId,
			Target: target
		});
		const results = await withNotificationTimeout(() => message.send({
			target,
			content: { markdown: { content: claim.content } },
			wakeup: target.scope === "c2c" && claim.mode === "wakeup"
		}));
		if (results.length === 1 && results[0].code === Ok && results[0].data?.id) return {
			...receipt,
			status: "sent",
			messageId: results[0].data.id
		};
		const data = results.length === 1 ? results[0].data : void 0;
		return {
			...receipt,
			status: results.length === 1 && results[0].code !== Ok && typeof data?.code === "number" && data.code > 0 ? "failed" : "unknown",
			platformCode: data?.code,
			error: JSON.stringify(results).slice(0, 2e3)
		};
	} catch (error) {
		return {
			...receipt,
			error: error instanceof Error ? error.message : "平台发送结果未知"
		};
	}
}
/** One bounded batch, with an explicit continuation and a recovery poll for
* missed SSE publications. A failed receipt never repeats the platform send. */
var ChatNoticeLane = class {
	bots;
	claim;
	send;
	finish;
	running = false;
	stopped = false;
	requested = false;
	timer;
	inFlight = /* @__PURE__ */ new Map();
	constructor(bots, claim = claimNextChatNotice, send = sendChatNotice, finish = finishChatNotice) {
		this.bots = bots;
		this.claim = claim;
		this.send = send;
		this.finish = finish;
	}
	async dispatch() {
		if (this.stopped) return;
		if (this.running) {
			this.requested = true;
			return;
		}
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = void 0;
		}
		const startedAt = Date.now();
		this.running = true;
		this.requested = false;
		let delay = 3e4;
		try {
			for (const botId of this.bots()) {
				if (this.stopped) break;
				if ((this.inFlight.get(botId) ?? 0) >= 32) {
					delay = 125;
					continue;
				}
				const next = await this.claim(botId);
				if (next.pending) delay = 125;
				if (!next.claim) continue;
				if (this.stopped) break;
				this.inFlight.set(botId, (this.inFlight.get(botId) ?? 0) + 1);
				this.deliver(next.claim).finally(() => {
					this.inFlight.set(botId, (this.inFlight.get(botId) ?? 1) - 1);
				});
			}
		} catch (error) {
			delay = 5e3;
			logger.error("消息管理通知投递暂停；未确认的发送不会自动重发", error);
		} finally {
			this.running = false;
			if (!this.stopped) {
				this.timer = setTimeout(() => {
					this.timer = void 0;
					this.dispatch();
				}, Math.max(0, (this.requested ? 125 : delay) - (Date.now() - startedAt)));
				this.timer.unref?.();
			}
		}
	}
	async deliver(item) {
		try {
			const result = await this.send(item);
			try {
				await this.finish(result);
			} catch {
				await this.finish(result);
			}
		} catch (error) {
			logger.error("消息管理回执未确认；不会重复发送", error);
		}
	}
	stop() {
		this.stopped = true;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = void 0;
		}
	}
};
/** Private and group queues have independent timers, claim requests and capacity. */
var ChatNoticeDispatcher = class {
	lanes;
	constructor(bots, claim = claimNextChatNotice, send = sendChatNotice, finish = finishChatNotice, scopes = ["c2c", "group"]) {
		this.lanes = [...new Set(scopes)].map((scope) => new ChatNoticeLane(bots, (botId) => claim(botId, scope), send, finish));
	}
	async dispatch() {
		await Promise.all(this.lanes.map((lane) => lane.dispatch()));
	}
	stop() {
		for (const lane of this.lanes) lane.stop();
	}
};
const configuredBots = () => {
	if (process.env.login && process.env.login !== "qq-bot") return [];
	const values = getConfigValue() ?? {};
	const config = {
		...values["qq-bot"],
		...values["@alemonjs/qq-bot"]
	};
	return config.bots ? Object.keys(config.bots) : config.app_id ? [String(config.app_id)] : [];
};
let dispatcher = new ChatNoticeDispatcher(configuredBots);
const dispatchChatNotices = () => dispatcher.dispatch();
const startChatNotices = () => {
	dispatcher.stop();
	dispatcher = new ChatNoticeDispatcher(configuredBots);
	dispatcher.dispatch();
};
const stopChatNotices = () => dispatcher.stop();

//#endregion
export { ChatNoticeDispatcher, dispatchChatNotices, sendChatNotice, startChatNotices, stopChatNotices };