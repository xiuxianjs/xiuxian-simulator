import { getAppConfig } from "../utils/appConfig.js";
import { getBackendConfig } from "../api/bot/config.js";
import { playerNotificationEnabled } from "../api/bot/notification-cache.js";
import { withFlyMailBuffer } from "../notification/flymailBuffer.js";
import { flyMailNoticeData } from "../utils/flyMailPresentation.js";
import { acknowledgeNotificationRelay, archiveNotificationRelay, claimNotificationRelay, getLegacySentNotificationIDs, markLegacyNotificationSent, retryNotificationRelay } from "../api/bot/notification-relay.js";
import { deliverLegacyNotification, deliverNotificationOnce, deliverPlayerNotification } from "../notification/service.js";
import { deliverFlyMailNotification } from "../notification/flymailDelivery.js";
import { notificationNoticeData } from "../notification/presentation.js";
import { logger } from "alemonjs";
import { randomUUID } from "crypto";

//#region src/task/pushMessageTask.ts
const parsePayload = (raw) => {
	try {
		const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
		return payload && typeof payload === "object" ? payload : null;
	} catch {
		return null;
	}
};
const proactiveEnabled = () => !getAppConfig()?.close_proactive_message;
/** 服务端登记的平台账号归属；仅用于兼容尚未下发归属的旧服务端。 */
const runtimeOwnerByBid = /* @__PURE__ */ new Map();
/**
* 通知所属用户以服务端下发的归属为准（recipientUserId/recipientBid）。
* payloadUserId 只作为旧服务端的兼容回退；两边都给出却不一致时不能猜，交给重试。
*/
function resolveNotificationOwner(row, bid, payloadUserId) {
	const declared = row.recipientUserId;
	const payloadOwner = Number.isSafeInteger(payloadUserId) && payloadUserId > 0 ? payloadUserId : void 0;
	if (!Number.isSafeInteger(declared) || declared <= 0) {
		if (payloadOwner !== void 0) return payloadOwner;
		const known = runtimeOwnerByBid.get(bid);
		if (known !== void 0) return known;
		throw new Error(`通知缺少所属用户: ${bid}`);
	}
	const owner = declared;
	if (payloadOwner !== void 0 && payloadOwner !== owner) throw new Error(`通知归属与载荷玩家不一致: ${owner} != ${payloadOwner}`);
	if (row.recipientBid && row.recipientBid !== bid) throw new Error(`通知归属平台账号不一致: ${row.recipientBid} != ${bid}`);
	runtimeOwnerByBid.set(bid, owner);
	return owner;
}
async function dispatchPlayerNotifications(loadLegacyIDs, lane) {
	const consumer = `node.${lane}.player-notification:${randomUUID()}`;
	while (true) {
		const row = await claimNotificationRelay("player.notification.dispatch", consumer, lane);
		if (!row) break;
		await processPlayerNotification(row, consumer, loadLegacyIDs, lane);
	}
}
async function processPlayerNotification(row, consumer, loadLegacyIDs, lane) {
	try {
		if ((lane === "flymail" ? /* @__PURE__ */ new Set() : await loadLegacyIDs()).has(row.eventId)) {
			await acknowledgeNotificationRelay(row.eventId, consumer, {
				route: "history",
				reason: "no_target"
			});
			return;
		}
		const payload = parsePayload(row.payload);
		if (payload?.version !== 1 || !Number.isSafeInteger(payload.recipientUserId) || payload.recipientUserId <= 0 || !Array.isArray(payload.data)) throw new Error("玩家通知事件载荷无效");
		if (payload.source?.startsWith("black-box.") || payload.source?.startsWith("guild.competition.")) {
			await acknowledgeNotificationRelay(row.eventId, consumer, {
				route: "history",
				reason: "proactive_disabled"
			});
			return;
		}
		const blackBoxNotice = payload.source?.startsWith("black-box.") === true;
		if (!row.recipientBid && !blackBoxNotice && payload.source !== "flymail.subscription.required" && payload.source !== "flymail.message.received") throw new Error(`通知接收玩家未绑定平台账号: ${payload.recipientUserId}`);
		const ownerUserId = resolveNotificationOwner(row, row.recipientBid ?? "", payload.recipientUserId);
		const data = payload.source === "flymail.message.received" ? flyMailNoticeData(payload.flymail, ownerUserId) ?? notificationNoticeData(payload.data, payload.source) : notificationNoticeData(payload.data, payload.source);
		const delivery = await deliverNotificationOnce(row.eventId, async () => {
			if (blackBoxNotice && (payload.blackBoxOptIn !== true || ![
				"black-box.reminder",
				"black-box.opening",
				"black-box.started",
				"black-box.result",
				"black-box.admission"
			].includes(payload.source))) return {
				route: "history",
				reason: "proactive_disabled"
			};
			if (!await playerNotificationEnabled(ownerUserId, payload.source)) return {
				route: "history",
				reason: "proactive_disabled"
			};
			if (blackBoxNotice && !row.recipientBid) return Promise.resolve({
				route: "history",
				reason: "no_target"
			});
			if (payload.source === "flymail.subscription.required") return Promise.resolve({
				route: "history",
				reason: "no_target"
			});
			if (payload.source === "flymail.message.received") return deliverFlyMailNotification(row.eventId, row.recipientBid ?? "", data, proactiveEnabled());
			return deliverPlayerNotification(ownerUserId, row.recipientBid, data, proactiveEnabled(), blackBoxNotice ? { privateOnly: true } : void 0);
		});
		await acknowledgeNotificationRelay(row.eventId, consumer, delivery);
		logger.info("玩家通知处理完成", {
			eventId: row.eventId,
			userId: ownerUserId,
			...delivery
		});
	} catch (error) {
		await retryNotificationRelay(row.eventId, consumer, error);
		logger.error(`玩家通知处理失败: ${row.eventId}`, error);
	}
}
async function dispatchWorkerMessages(loadLegacyIDs) {
	const consumer = `node.platform-message:${randomUUID()}`;
	while (true) {
		const row = await claimNotificationRelay("platform.message.dispatch", consumer);
		if (!row) break;
		const payload = parsePayload(row.payload);
		const messageId = String(payload?.messageId ?? "");
		try {
			const mids = await loadLegacyIDs();
			if (messageId && mids.has(messageId)) {
				await acknowledgeNotificationRelay(row.eventId, consumer, {
					route: "history",
					reason: "no_target"
				});
				continue;
			}
			if (!payload || !payload.cid && !payload.uid) throw new Error("主动消息缺少接收方");
			const data = typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data;
			if (!Array.isArray(data)) throw new Error("主动消息内容无效");
			const ownerUserId = payload.uid ? resolveNotificationOwner(row, payload.uid, payload.subscriptionUserId) : void 0;
			if (payload.uid) await archiveNotificationRelay(payload.uid, `platform.message:${messageId || row.eventId}`, data);
			const notice = notificationNoticeData(data);
			const delivery = await deliverNotificationOnce(`platform:${messageId || row.eventId}`, async () => {
				if (ownerUserId !== void 0 && !await playerNotificationEnabled(ownerUserId)) return {
					route: "history",
					reason: "proactive_disabled"
				};
				if (ownerUserId !== void 0 && payload.uid) return deliverPlayerNotification(ownerUserId, payload.uid, notice.filter((block) => block.type !== "Mention"), proactiveEnabled());
				return deliverLegacyNotification({
					...payload,
					data: notice
				}, proactiveEnabled());
			});
			await acknowledgeNotificationRelay(row.eventId, consumer, delivery);
			if (messageId) {
				await markLegacyNotificationSent(messageId);
				mids.add(messageId);
			}
		} catch (error) {
			await retryNotificationRelay(row.eventId, consumer, error);
			logger.error(`Worker 主动消息处理失败: ${row.eventId}`, error);
		}
	}
}
let running = false;
let pending = false;
const dispatchStandardMessages = async () => {
	pending = true;
	if (running) return;
	running = true;
	try {
		while (pending) {
			pending = false;
			let legacyIDs;
			const loadLegacyIDs = () => legacyIDs ??= getLegacySentNotificationIDs();
			if (!getBackendConfig().channelMode) await dispatchWorkerMessages(loadLegacyIDs);
			await dispatchPlayerNotifications(loadLegacyIDs, "standard");
		}
	} catch (error) {
		logger.error("通知推送任务失败", error);
		throw error;
	} finally {
		running = false;
	}
};
const FLYMAIL_IN_FLIGHT_LIMIT = 32;
let flyMailRunning = false;
let wakeFlyMail;
const PushFlyMailTask = async () => {
	wakeFlyMail?.();
	if (flyMailRunning) return;
	flyMailRunning = true;
	const consumer = `node.flymail.player-notification:${randomUUID()}`;
	const active = /* @__PURE__ */ new Set();
	const emptyLegacyIDs = () => Promise.resolve(/* @__PURE__ */ new Set());
	try {
		while (true) {
			let wake;
			let notified = false;
			const signal = new Promise((resolve) => {
				wake = () => {
					notified = true;
					resolve();
				};
			});
			wakeFlyMail = wake;
			if (active.size >= FLYMAIL_IN_FLIGHT_LIMIT) {
				await Promise.race(active);
				continue;
			}
			const row = await claimNotificationRelay("player.notification.dispatch", consumer, "flymail");
			if (!row) {
				if (!active.size) {
					if (notified) continue;
					break;
				}
				await Promise.race([...active, signal]);
				continue;
			}
			const delivery = withFlyMailBuffer(() => processPlayerNotification(row, consumer, emptyLegacyIDs, "flymail"));
			active.add(delivery);
			delivery.then(() => {
				active.delete(delivery);
			}, () => {});
		}
	} finally {
		wakeFlyMail = void 0;
		await Promise.allSettled(active);
		flyMailRunning = false;
	}
};
const PushMessageTask = async () => {
	await Promise.all([PushFlyMailTask(), dispatchStandardMessages()]);
};

//#endregion
export { PushFlyMailTask, PushMessageTask, dispatchStandardMessages };