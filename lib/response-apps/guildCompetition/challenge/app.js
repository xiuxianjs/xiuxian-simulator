import { challengeBackendGuildCompetition } from "../../../api/bot/guild-competition-actions.js";

//#region src/response-apps/guildCompetition/challenge/app.ts
async function App(params) {
	try {
		const result = await challengeBackendGuildCompetition(params.bid, params.uid, params.defenderGuildId, params.request);
		return {
			code: "OK",
			data: {
				message: typeof result.message === "string" ? result.message : "挑战完成",
				battleLogId: typeof result.logId === "string" ? result.logId : null
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "挑战失败" }
		};
	}
}

//#endregion
export { App as default };