import { robberyRecordsView } from "../../api/bot/market-community-views.js";
import { logger } from "alemonjs";

//#region src/response-apps/robberyRecord/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await robberyRecordsView(params.bid, params.uid, params.page, params.request)
		};
	} catch (error) {
		logger.error("[打劫记录] 错误:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "获取打劫记录失败" }
		};
	}
}

//#endregion
export { App as default };