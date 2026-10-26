import { applyBackendGuildCompetition } from "../../../api/bot/guild-competition-actions.js";

//#region src/response-apps/guildCompetition/apply/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await applyBackendGuildCompetition(params.bid, params.uid, params.request)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "报名失败" }
		};
	}
}

//#endregion
export { App as default };