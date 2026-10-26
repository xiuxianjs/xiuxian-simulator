import { presentAlchemyLeaderboard } from "../../../utils/alchemyQueryPresentation.js";
import { getBackendAlchemyRanking } from "../../../api/bot/alchemy-ranking-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/alchemy/leaderboard/app.ts
async function App(params) {
	try {
		const currentUid = params.uid ?? 0;
		const result = await getBackendAlchemyRanking(params.bid, currentUid, params.page, params.pageSize);
		if (!result.access.canAccess) return {
			code: "LOCKED",
			realmName: result.access.realmName ?? "未知"
		};
		return presentAlchemyLeaderboard(result, currentUid);
	} catch (error) {
		logger.error("查询丹师排行榜失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };