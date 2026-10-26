import { betBackendGuildCompetition } from "../../../api/bot/guild-competition-actions.js";

//#region src/response-apps/guildCompetition/bet/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await betBackendGuildCompetition(params.bid, params.uid, params.guildId, params.amount, params.request)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "押注失败" }
		};
	}
}

//#endregion
export { App as default };