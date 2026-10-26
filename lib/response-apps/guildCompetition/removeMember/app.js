import { removeBackendGuildCompetitionMember } from "../../../api/bot/guild-competition-actions.js";

//#region src/response-apps/guildCompetition/removeMember/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await removeBackendGuildCompetitionMember(params.bid, params.uid, params.pos, params.request)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "移除成员失败" }
		};
	}
}

//#endregion
export { App as default };