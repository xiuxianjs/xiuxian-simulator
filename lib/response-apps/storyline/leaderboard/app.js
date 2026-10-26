import { getBackendStorylineRanking } from "../../../api/bot/storyline-ranking-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/storyline/leaderboard/app.ts
async function App(params) {
	try {
		const result = await getBackendStorylineRanking(params.bid, params.uid, params.page);
		if (!result.access.ok || !result.leaderboard) return {
			code: "LOCKED",
			data: { realmName: result.access.realmName ?? "未知" }
		};
		return {
			code: "OK",
			data: result.leaderboard
		};
	} catch (error) {
		logger.error("查询主线排行榜失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询主线排行榜失败" }
		};
	}
}

//#endregion
export { App as default };