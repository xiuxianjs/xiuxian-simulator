import { exchangeBackendGuildShopByIndex } from "../../../api/bot/guild-shop-actions.js";

//#region src/response-apps/guild/exchange/app.ts
async function App(params) {
	try {
		const result = await exchangeBackendGuildShopByIndex(params.bid, params.uid, params.itemIndex, params.request, params.repeatCommand);
		return {
			code: "OK",
			data: {
				itemName: result.itemName,
				quantity: result.quantity,
				prestigeGain: result.prestigeGain,
				remainingDailyCount: result.remainingDailyCount
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "兑换失败" }
		};
	}
}

//#endregion
export { App as default };