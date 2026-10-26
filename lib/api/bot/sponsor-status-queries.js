import { requestBackend } from "./client.js";

//#region src/api/bot/sponsor-status-queries.ts
async function getBackendSponsorStatus(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendSponsorStatus(await requestBackend(bid, "get_players_id_payments_sponsor_status", { path: { id: uid } }));
}
function parseBackendSponsorStatus(value) {
	const data = value;
	if (!data || typeof data.hasThemePermission !== "boolean") throw new Error("赞助状态响应不完整");
	for (const key of [
		"totalFen",
		"totalYuan",
		"thresholdFen",
		"thresholdYuan",
		"remainingFen",
		"remainingYuan"
	]) if (typeof data[key] !== "number" || !Number.isFinite(data[key])) throw new Error("赞助状态数值不完整");
	return data;
}

//#endregion
export { getBackendSponsorStatus, parseBackendSponsorStatus };