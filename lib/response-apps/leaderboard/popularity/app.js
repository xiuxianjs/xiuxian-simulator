import { getBackendPopularity } from "../../../api/bot/popularity-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/leaderboard/popularity/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendPopularity(params.bid, params.uid)
		};
	} catch (error) {
		logger.error("[人气排行榜] 错误:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看人气排行榜失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };