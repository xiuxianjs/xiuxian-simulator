import { exactInteger } from "../core/exact-json.js";
import { requestBackend } from "./client.js";

//#region src/api/bot/guild-shop-page.ts
async function getBackendGuildShopPage(bid, uid) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildShopPage(await requestBackend(bid, "get_players_id_guild_shop_page", { path: { id: uid } }));
}
function parseGuildShopPage(value) {
	const data = value;
	const integer = (value) => {
		try {
			exactInteger(value);
			return true;
		} catch {
			return false;
		}
	};
	const numeric = (value) => typeof value === "number" && Number.isFinite(value);
	if (!data || !integer(data.contributionPoints) || typeof data.autoRefreshEnabled !== "boolean" || !Array.isArray(data.autoRefreshHours) || !data.autoRefreshHours.every(numeric) || typeof data.autoRefreshStatusText !== "string" || !Number.isSafeInteger(data.refreshDailyLimit) || data.refreshDailyLimit < 1 || typeof data.isLeader !== "boolean" || !Array.isArray(data.items)) throw new Error("宗门商店响应不完整");
	for (const item of data.items) if (!item || !Number.isSafeInteger(item.id) || !Number.isSafeInteger(item.index) || item.index < 1 || !Number.isSafeInteger(item.itemId) || typeof item.name !== "string" || typeof item.category !== "string" || !integer(item.quantity) || !integer(item.priceContribution) || typeof item.purchased !== "boolean" || typeof item.statusText !== "string" || typeof item.canExchange !== "boolean" || item.slotName !== void 0 && typeof item.slotName !== "string" || item.locked !== void 0 && typeof item.locked !== "boolean" || item.locked === true && (item.canExchange || item.id !== 0) || item.itemType !== null && typeof item.itemType !== "string" || item.itemSubtype !== null && typeof item.itemSubtype !== "string") throw new Error("宗门商店商品响应不完整");
	return data;
}

//#endregion
export { getBackendGuildShopPage, parseGuildShopPage };