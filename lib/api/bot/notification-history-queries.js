import { requestBackend } from "./client.js";

//#region src/api/bot/notification-history-queries.ts
const record = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const date = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
async function getBackendNotificationHistory(bid, uid, page) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseNotificationHistory(await requestBackend(bid, "get_players_id_notifications", {
		path: { id: uid },
		query: { page }
	}), page);
}
function parseNotificationHistory(data, page) {
	if (!record(data) || !Number.isSafeInteger(data.page) || data.page !== page || typeof data.hasNext !== "boolean" || !Array.isArray(data.items) || data.items.length > 5 || data.items.some((item) => !record(item) || typeof item.id !== "string" || !date(item.time) || typeof item.text !== "string" || typeof item.delivery !== "string")) throw new Error("通知记录接口数据不完整");
	return data;
}

//#endregion
export { getBackendNotificationHistory, parseNotificationHistory };