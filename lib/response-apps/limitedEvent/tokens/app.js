import { getBackendEventTokens } from "../../../api/bot/event-tokens-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/limitedEvent/tokens/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { tokens: await getBackendEventTokens(params.bid, params.uid) }
		};
	} catch (error) {
		logger.error("[活动道具] 错误:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看活动道具失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };