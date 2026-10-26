import { getBackendBattleLeaderboard } from "../../../api/bot/battle-leaderboard-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/battle/leaderboard/app.ts
async function App(params) {
	try {
		const result = await getBackendBattleLeaderboard(params.bid, params.uid, params.page, params.regional);
		if (!result.access.ok || !result.leaderboard) return {
			code: "LOCKED",
			data: { realmName: result.access.realmName ?? "未知" }
		};
		return {
			code: "OK",
			data: {
				...result.leaderboard,
				canUseSpar: result.access.canUseSpar
			}
		};
	} catch (error) {
		logger.error("[战力排行榜] 查询失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看战力排行榜失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };