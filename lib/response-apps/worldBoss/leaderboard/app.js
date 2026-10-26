import { getBackendWorldBossRanking } from "../../../api/bot/world-boss-ranking-queries.js";
import { worldBossRankingView } from "../../../response/worldBoss/view.js";
import { logger } from "alemonjs";

//#region src/response-apps/worldBoss/leaderboard/app.ts
async function App(params) {
	try {
		const facts = await getBackendWorldBossRanking(params.bid, params.uid);
		if (!facts.available) return {
			code: "LOAD_FAILED",
			data: { message: facts.unavailableMessage }
		};
		return {
			code: "OK",
			data: worldBossRankingView(facts)
		};
	} catch (error) {
		logger.error("查询凶兽排行失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询排行失败" }
		};
	}
}

//#endregion
export { App as default };