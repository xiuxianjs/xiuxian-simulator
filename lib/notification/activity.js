import { isPrivateEvent } from "../utils/privateEvent.js";
import { rememberPlatformGroupActivity } from "../api/bot/notification-cache.js";
import { legacyNotificationTarget } from "./delivery.js";
import { notificationChannel, refreshNotificationPermission } from "./channel.js";
import { logger } from "alemonjs";

//#region src/notification/activity.ts
const pending = /* @__PURE__ */ new Map();
let running = 0;
const MAX_PENDING = 2e3;
const CONCURRENCY = 4;
/** Observe all incoming messages, including messages that match no game command. */
function observePlayerGroupActivity(event) {
	if (event.name !== "message.create" && event.name !== "interaction.create") return;
	if (isPrivateEvent(event) || event.IsBot || !event.UserId) return;
	const botId = event.Target?.BotId ?? event.BotId;
	const target = event.Target ? {
		...event.Target,
		platform: event.Platform,
		BotId: botId
	} : event.SpaceId?.startsWith("GROUP:") || event.Platform === "onebot" ? legacyNotificationTarget(event.ChannelId, "group", event.Platform, botId) : null;
	if (!target?.targetId || target.scope !== "group" || !botId) return;
	const key = JSON.stringify([
		event.Platform,
		botId,
		event.UserId,
		target.targetId
	]);
	const occurredAt = Number.isSafeInteger(event.OccurredAt) && event.OccurredAt > 0 ? event.OccurredAt : Date.now();
	const previous = pending.get(key);
	if (previous && previous.activity.occurredAt >= occurredAt) return;
	if (!previous && pending.size >= MAX_PENDING) {
		logger.warn("玩家活动位置上报队列已满，等待后续群活动更新");
		return;
	}
	pending.set(key, {
		bid: event.UserId,
		activity: {
			target,
			occurredAt
		}
	});
	while (running < CONCURRENCY && pending.size > 0) {
		running++;
		drain();
	}
}
async function drain() {
	try {
		while (pending.size > 0) {
			const [key, observation] = pending.entries().next().value;
			pending.delete(key);
			await (async () => {
				try {
					const state = await notificationChannel.read(observation.activity.target);
					if (!state || state.state === "unknown") await refreshNotificationPermission(observation.activity.target);
				} catch (error) {
					logger.warn("群活动权限探测失败，发送前继续复核", error);
				}
				await rememberPlatformGroupActivity(observation.bid, observation.activity);
			})().catch((error) => logger.error("玩家群活动位置上报失败", error));
		}
	} finally {
		running--;
	}
}

//#endregion
export { observePlayerGroupActivity };