import { claimBackendGuildCompetitionRewards } from "../../../api/bot/guild-competition-actions.js";

//#region src/response-apps/guildCompetition/claimReward/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await claimBackendGuildCompetitionRewards(params.bid, params.request)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "领取奖励失败" }
		};
	}
}

//#endregion
export { App as default };