import { cancelBackendMarketListing } from "../../../api/bot/market-cancel.js";

//#region src/response-apps/market/cancel/app.ts
async function App(params) {
	try {
		const res = await cancelBackendMarketListing(params.bid, params.uid, params.listingId, params.request, params.messageText);
		return {
			code: "OK",
			data: { message: `${res.message}：${res.itemName}${res.feeAmount > 0 ? `，返还手续费${res.feeAmount}灵晶` : ""}` }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "交易下架失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };