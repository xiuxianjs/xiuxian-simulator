import { getAppConfig } from "../../utils/appConfig.js";
import { getNotificationBackendConfig, getWorkerBackendConfig } from "./config.js";
import { measureTransportStage } from "../../utils/transportTiming.js";
import { backendConnectionPools } from "./connection-pools.js";
import axios from "axios";

//#region src/api/bot/notification-relay.ts
function relayClient() {
	const config = getNotificationBackendConfig();
	return axios.create({
		...backendConnectionPools,
		baseURL: config.url,
		timeout: config.timeoutMs,
		headers: config.headers,
		...config.channelMode ? { maxRedirects: 0 } : {}
	});
}
async function post(path, body) {
	return (await relayClient().post(`/api/v1/internal/notification-relay${path}`, body)).data.data;
}
async function claimNotificationRelay(eventType, consumer, lane) {
	return (await post("/claim", {
		eventType,
		consumer,
		...lane ? { lane } : {}
	})).event;
}
async function acknowledgeNotificationRelay(eventId, consumer, delivery) {
	await post("/ack", {
		eventId,
		consumer,
		delivery
	});
}
async function retryNotificationRelay(eventId, consumer, error) {
	await post("/retry", {
		eventId,
		consumer,
		error: error instanceof Error ? error.message : String(error)
	});
}
async function archiveNotificationRelay(bid, key, data) {
	await post("/archive", {
		bid,
		key,
		data
	});
}
/**
* 登记平台地址及其所属玩家，供 Go 认领旧消息池时确定通知归属。
* playerId 是机器人已解析出的游戏玩家 ID；未知时省略，服务端回退到账号匹配。
*/
async function registerNotificationRecipient(uid, cid, playerId, traceEvent) {
	if (!uid && !cid) return;
	const owner = Number.isSafeInteger(playerId) && playerId > 0 ? playerId : void 0;
	await measureTransportStage("notification.recipient", () => post("/recipient", {
		botId: notificationBotId(),
		uid: uid ?? "",
		cid: cid ?? "",
		...owner === void 0 ? {} : { playerId: owner }
	}), traceEvent);
}
const notificationBotId = () => {
	const config = getNotificationBackendConfig();
	return config.channelMode ? config.channelBotId : String(getAppConfig()?.botId ?? "xiuxian");
};
async function getLegacySentNotificationIDs() {
	const data = await post("/legacy-sent-ids", { botId: notificationBotId() });
	if (!data || !Array.isArray(data.ids) || data.ids.some((id) => typeof id !== "string")) throw new Error("旧消息去重回执不完整");
	return new Set(data.ids);
}
async function markLegacyNotificationSent(messageId) {
	await post("/legacy-sent", {
		botId: notificationBotId(),
		messageId
	});
}
/** When Node owns the schedule, it triggers the same Go scanner the autonomous Worker uses. */
async function scanLegacyNotificationPool() {
	getWorkerBackendConfig();
	await relayClient().post("/api/v1/internal/workers/push-message-relay/run", {});
}
async function getNotificationSubscriptionTarget(playerId) {
	const data = await post("/subscription", { playerId });
	if (data === null) return null;
	if (!data || typeof data.platform !== "string" || typeof data.channelId !== "string" || !["group", "channel"].includes(data.targetScope) || typeof data.isEnabled !== "boolean" || !Number.isSafeInteger(data.failureCount) || ![
		data.botId,
		data.lastDeliveryAt,
		data.lastError
	].every((value) => value === null || typeof value === "string")) throw new Error("通知订阅目标数据不完整");
	return data;
}
async function recordNotificationSubscriptionDelivery(playerId, target, failure) {
	await post("/subscription/receipt", {
		playerId,
		target,
		failure: failure ?? null
	});
}

//#endregion
export { acknowledgeNotificationRelay, archiveNotificationRelay, claimNotificationRelay, getLegacySentNotificationIDs, getNotificationSubscriptionTarget, markLegacyNotificationSent, recordNotificationSubscriptionDelivery, registerNotificationRecipient, retryNotificationRelay, scanLegacyNotificationPool };