import { postBackendGuildMilestoneClaim } from "../../../api/bot/guild-milestone-claim.js";

//#region src/response-apps/guild/claimMilestone/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await postBackendGuildMilestoneClaim(params.bid, params.uid, params.milestoneId, params.request, params.repeatCommand)).message }
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