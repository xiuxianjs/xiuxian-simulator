import { marketWorkflow } from "../../../api/bot/market-community-views.js";

//#region src/response-apps/market/confirmBuy/app.ts
async function App(params) {
	try {
		const data = await marketWorkflow(params.bid, params.uid, {
			action: "purchase",
			listingId: params.listingId,
			quantity: params.quantity,
			confirmed: params.isConfirmed
		}, params.request, params.messageText);
		if (data.preview) return {
			code: "NEED_CONFIRM",
			data: data.preview
		};
		const result = data.receipt;
		if (!result || typeof result.message !== "string") throw new Error("选购响应不完整");
		return {
			code: "OK",
			data: { message: result.message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "选购失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };