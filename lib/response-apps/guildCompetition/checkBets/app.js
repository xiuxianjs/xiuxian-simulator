import { getBackendCurrentMonthBets } from "../../../api/bot/competition-bets-query.js";

//#region src/response-apps/guildCompetition/checkBets/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { bets: (await getBackendCurrentMonthBets(params.bid)).bets ?? [] }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "查询押注记录失败" }
		};
	}
}

//#endregion
export { App as default };