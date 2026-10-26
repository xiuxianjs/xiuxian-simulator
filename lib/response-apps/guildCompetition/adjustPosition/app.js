import { adjustBackendGuildCompetitionMember } from "../../../api/bot/guild-competition-actions.js";

//#region src/response-apps/guildCompetition/adjustPosition/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await adjustBackendGuildCompetitionMember(params.bid, params.uid, params.fromPos, params.toPos, params.request)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "调整失败" }
		};
	}
}

//#endregion
export { App as default };