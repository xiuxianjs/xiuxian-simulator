import { claimAllBackendWorldBossRewards } from "../../../api/bot/world-boss-claim.js";
import { logger } from "alemonjs";

//#region src/response-apps/worldBoss/claim/app.ts
async function App(params) {
	try {
		const results = await claimAllBackendWorldBossRewards(params.bid, params.uid, params.request);
		return {
			code: "OK",
			data: {
				items: results.items.map((r) => {
					return {
						bossDate: r.bossDate,
						stageName: r.stageName,
						tierName: r.tierName,
						spiritStone: r.spiritStone,
						spiritCrystal: r.spiritCrystal
					};
				}),
				totalStone: results.totalStone,
				totalCrystal: results.totalCrystal
			}
		};
	} catch (error) {
		if (error instanceof Error) logger.info(`领取凶兽奖励失败: ${error.message}`);
		else logger.error("领取凶兽奖励失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "领取奖励失败" }
		};
	}
}

//#endregion
export { App as default };