import { followBetBackendGuildCompetition } from "../../../api/bot/guild-competition-actions.js";

//#region src/response-apps/guildCompetition/followBet/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await followBetBackendGuildCompetition(params.bid, params.uid, params.amount, params.request)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "追投失败" }
		};
	}
}

//#endregion
export { App as default };