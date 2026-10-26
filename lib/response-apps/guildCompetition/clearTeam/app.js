import { clearBackendGuildCompetitionTeam } from "../../../api/bot/guild-competition-actions.js";

//#region src/response-apps/guildCompetition/clearTeam/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await clearBackendGuildCompetitionTeam(params.bid, params.uid, params.request)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "清空失败" }
		};
	}
}

//#endregion
export { App as default };