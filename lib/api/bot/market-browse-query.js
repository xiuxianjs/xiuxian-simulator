import { requestBackend } from "./client.js";
import { assertMarketBrowseItem } from "../schemas/market-browse-item.js";

//#region src/api/bot/market-browse-query.ts
const isInteger = (value) => typeof value === "number" && Number.isSafeInteger(value);
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function assertMarketBrowse(data) {
	const value = data;
	if (!isRecord(value) || !value || !isInteger(value.spiritsCrystal) || !isRecord(value.quota) || !Array.isArray(value.items) || !isRecord(value.pagination)) throw new Error("珍宝楼浏览响应不完整");
	const quota = value.quota;
	const pagination = value.pagination;
	if (![
		quota.dailyLimit,
		quota.dailyUsed,
		quota.remaining,
		pagination.currentPage,
		pagination.totalPages,
		pagination.total
	].every(isInteger)) throw new Error("珍宝楼浏览响应不完整");
	for (const item of value.items) assertMarketBrowseItem(item, "珍宝楼浏览响应不完整");
}
async function getBackendMarketBrowse(bid, uid, query, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendMarketBrowse(await requestBackend(bid, "get_players_id_market_browse", {
		path: { id: uid },
		query,
		...request?.requestId ? { requestId: request.requestId } : {}
	}));
}
function parseBackendMarketBrowse(data) {
	assertMarketBrowse(data);
	return data;
}

//#endregion
export { getBackendMarketBrowse, parseBackendMarketBrowse };