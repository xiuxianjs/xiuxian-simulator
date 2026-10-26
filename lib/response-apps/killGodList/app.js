import { getBackendKillGodRanking } from "../../api/bot/shaqi-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/killGodList/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendKillGodRanking(params.bid, params.uid)
		};
	} catch (error) {
		logger.error("[杀神榜] 错误:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看杀神榜失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };