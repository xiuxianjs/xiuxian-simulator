import { requestBackend } from "./client.js";
import { assertPlayerShopInfo } from "../schemas/player-shop-visit-query.js";
import { assertMarketBrowseItem } from "../schemas/market-browse-item.js";

//#region src/api/bot/player-shop-visit-query.ts
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const date = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
function assertVisitShop(data) {
	const value = data;
	if (!record(value) || !value || !record(value.currencies) || !Array.isArray(value.items) || !record(value.pagination) || value.shop !== null && !record(value.shop)) throw new Error("逛店响应不完整");
	const currencies = value.currencies;
	if (![
		"spiritStone",
		"spiritsCrystal",
		"spiritsMilk",
		"signInCoin",
		"towerScore",
		"reputation",
		"tongxin",
		"greenBottle"
	].every((key) => integer(currencies[key])) || ![
		value.pagination.currentPage,
		value.pagination.totalPages,
		value.pagination.total
	].every(integer)) throw new Error("逛店响应不完整");
	if (value.shop !== null) assertPlayerShopInfo(value.shop, "逛店响应不完整");
	for (const item of value.items) {
		assertMarketBrowseItem(item, "逛店响应不完整");
		if (!integer(item.status) || item.lockedUntil !== null && !date(item.lockedUntil)) throw new Error("逛店响应不完整");
	}
}
async function getBackendPlayerShopVisit(bid, uid, ownerId, page, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendPlayerShopVisit(await requestBackend(bid, "get_players_id_market_shops_ownerId_browse", {
		path: {
			id: uid,
			ownerId
		},
		query: { page },
		...request?.requestId ? { requestId: request.requestId } : {}
	}));
}
function parseBackendPlayerShopVisit(data) {
	assertVisitShop(data);
	return data;
}

//#endregion
export { getBackendPlayerShopVisit, parseBackendPlayerShopVisit };