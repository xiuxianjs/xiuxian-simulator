import { getBackendCompetitionBattles } from "../../../api/bot/competition-battle-queries.js";
import { competitionBattleView } from "../../../response/guildCompetition/battleLog/view.js";

//#region src/response-apps/guildCompetition/battleLog/app.ts
async function App(params) {
	try {
		const data = await getBackendCompetitionBattles(params.bid, params.uid, params.page);
		return competitionBattleView(data);
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取战斗记录失败" }
		};
	}
}

//#endregion
export { App as default };