import { isPrivateEvent } from "../utils/privateEvent.js";
import { rememberPlatformGroupActivity } from "../api/bot/notification-cache.js";
import { legacyNotificationTarget } from "./delivery.js";
import { logger } from "alemonjs";

//#region src/notification/activity.ts
const pending = /* @__PURE__ */ new Map();
const inFlight = /* @__PURE__ */ new Map();
let resumeTimer;
let recovering = false;
let observing = false;
const MAX_PENDING = 2e3;
const CONCURRENCY = 4;
const RETRY_INITIAL_MS = 5e3;
const RETRY_MAX_MS = 6e4;
let retryDelay = RETRY_INITIAL_MS;
function startPlayerGroupActivityObserver() {
	observing = true;
}
function stopPlayerGroupActivityObserver() {
	observing = false;
	clearTimeout(resumeTimer);
	resumeTimer = void 0;
	recovering = false;
	retryDelay = RETRY_INITIAL_MS;
	pending.clear();
	inFlight.clear();
}
function startDraining() {
	if (!observing || resumeTimer !== void 0) return;
	const capacity = recovering ? 1 : CONCURRENCY;
	for (const [key, observation] of pending) {
		if (inFlight.size >= capacity) break;
		if (inFlight.has(key)) continue;
		pending.delete(key);
		inFlight.set(key, observation);
		report(key, observation, recovering);
	}
}
function pauseDraining(error) {
	recovering = true;
	const jitter = Math.floor(retryDelay * .25);
	const wait = Math.min(retryDelay, RETRY_MAX_MS - jitter) + Math.floor(jitter * Math.random());
	retryDelay = Math.min(RETRY_MAX_MS, retryDelay * 2);
	resumeTimer = setTimeout(() => {
		resumeTimer = void 0;
		startDraining();
	}, wait);
	resumeTimer.unref?.();
	logger.warn("通知缓存暂时不可用，暂停玩家群活动上报", error);
}
/** Observe all incoming messages, including messages that match no game command. */
function observePlayerGroupActivity(event) {
	if (!observing || event.name !== "message.create" && event.name !== "interaction.create") return;
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
	const sending = inFlight.get(key);
	if (Math.max(previous?.activity.occurredAt ?? 0, sending?.activity.occurredAt ?? 0) >= occurredAt) return;
	if (!previous && pending.size + inFlight.size >= MAX_PENDING) {
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
	startDraining();
}
async function report(key, observation, recoveryProbe) {
	let retry = false;
	try {
		await rememberPlatformGroupActivity(observation.bid, observation.activity);
	} catch (error) {
		if (inFlight.get(key) !== observation) return;
		const status = error?.status;
		retry = status === void 0 || status === 429 || status >= 500;
		if (retry) {
			if (!pending.has(key)) pending.set(key, observation);
			if (!recovering || recoveryProbe) pauseDraining(error);
		} else logger.error("玩家群活动位置上报失败", error);
	} finally {
		if (inFlight.get(key) === observation) {
			if (recoveryProbe && !retry) {
				recovering = false;
				retryDelay = RETRY_INITIAL_MS;
			}
			inFlight.delete(key);
			startDraining();
		}
	}
}

//#endregion
export { observePlayerGroupActivity, startPlayerGroupActivityObserver, stopPlayerGroupActivityObserver };