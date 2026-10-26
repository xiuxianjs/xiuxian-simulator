import { getBackendPromotionTeams } from "../../../api/bot/competition-read-projections.js";

//#region src/response-apps/guildCompetition/checkPromotionTeams/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendPromotionTeams(params.bid)
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询晋级赛队伍失败" }
		};
	}
}

//#endregion
export { App as default };