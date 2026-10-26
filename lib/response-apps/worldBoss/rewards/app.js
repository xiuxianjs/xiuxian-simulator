import { getBackendWorldBossRewards } from "../../../api/bot/world-boss-rewards-queries.js";
import { worldBossRewardsView } from "../../../response/worldBoss/view.js";
import { logger } from "alemonjs";

//#region src/response-apps/worldBoss/rewards/app.ts
async function App(params) {
	try {
		const facts = await getBackendWorldBossRewards(params.bid, params.uid);
		const { available, unavailableMessage, config } = facts;
		if (!available || !config) return {
			code: "LOAD_FAILED",
			data: { message: unavailableMessage }
		};
		return {
			code: "OK",
			data: worldBossRewardsView(facts)
		};
	} catch (error) {
		logger.error("查询凶兽奖励失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询奖励信息失败" }
		};
	}
}

//#endregion
export { App as default };