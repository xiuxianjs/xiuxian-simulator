import { requestBackend } from "./client.js";

//#region src/api/bot/market-guide-balance.ts
/** Command hints need a live balance, without loading market listings or purchase quota. */
async function getBackendMarketGuideBalance(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const value = await requestBackend(bid, "get_players_id_currencies", {
		path: { id: uid },
		...request?.requestId ? { requestId: request.requestId } : {}
	});
	const balance = value && typeof value === "object" && !Array.isArray(value) ? value.SPIRIT_CRYSTAL : void 0;
	if (typeof balance !== "number" || !Number.isSafeInteger(balance)) throw new Error("货币余额响应不完整");
	return balance;
}

//#endregion
export { getBackendMarketGuideBalance };