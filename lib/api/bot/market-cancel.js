import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { assertMarketMutationResult } from "../schemas/market-trade.js";

//#region src/api/bot/market-cancel.ts
async function cancelBackendMarketListing(bid, uid, listingId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const data = await requestBackend(bid, "post_players_id_market_listings_listingId_cancel", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: {
			id: uid,
			listingId
		},
		...writeContext(request)
	});
	assertMarketMutationResult(data, "交易下架响应不完整");
	const feeAmount = data?.feeAmount === void 0 ? 0 : data.feeAmount;
	if (!data || !Number.isSafeInteger(data.listingId) || !Number.isSafeInteger(data.quantity) || !Number.isSafeInteger(feeAmount) || feeAmount < 0 || typeof data.itemName !== "string" || typeof data.message !== "string") throw new Error("交易下架响应不完整");
	return {
		...data,
		feeAmount
	};
}

//#endregion
export { cancelBackendMarketListing };