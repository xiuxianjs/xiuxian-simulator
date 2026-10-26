import { getBackendCompetitionBattleDetail } from "../../../api/bot/competition-read-projections.js";

//#region src/response-apps/guildCompetition/battleDetail/app.ts
async function App(params) {
	try {
		if (!params.battleId) return {
			code: "LOAD_FAILED",
			data: { message: "请提供战斗记录ID" }
		};
		return {
			code: "OK",
			data: await getBackendCompetitionBattleDetail(params.bid, params.uid, params.battleId)
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "获取战斗详情失败" }
		};
	}
}

//#endregion
export { App as default };