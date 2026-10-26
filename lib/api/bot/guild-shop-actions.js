import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-shop-actions.ts
function parseGuildShopExchange(value) {
	const row = value;
	if (!row || typeof row !== "object" || Array.isArray(row) || !Number.isSafeInteger(row.itemId) || typeof row.itemName !== "string" || !Number.isSafeInteger(row.quantity) || !Number.isSafeInteger(row.contributionDelta) || !Number.isSafeInteger(row.prestigeGain) || !Number.isSafeInteger(row.remainingDailyCount)) throw new Error("宗门商店兑换响应不完整");
	return row;
}
/** 根据当前商店展示序号由服务端原子选取并兑换栏位。 */
async function exchangeBackendGuildShopByIndex(bid, uid, itemIndex, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildShopExchange(await requestBackend(bid, "post_players_id_guild_shop_exchange", {
		path: { id: uid },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand),
		body: { itemIndex }
	}));
}

//#endregion
export { exchangeBackendGuildShopByIndex, parseGuildShopExchange };