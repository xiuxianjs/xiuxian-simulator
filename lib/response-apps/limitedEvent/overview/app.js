import { getBackendEventOverview } from "../../../api/bot/event-overview-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/limitedEvent/overview/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { overview: await getBackendEventOverview(params.bid, params.uid) ?? [] }
		};
	} catch (error) {
		logger.error("[限时活动总览] 错误:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看限时活动失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };