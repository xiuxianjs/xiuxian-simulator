import { marketListingsView } from "../../../api/bot/market-community-views.js";
import { logger } from "alemonjs";

//#region src/response-apps/market/my/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await marketListingsView(params.bid, params.uid, params.page, params.request)
		};
	} catch (error) {
		logger.error("查看我的上架失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看我的上架失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };