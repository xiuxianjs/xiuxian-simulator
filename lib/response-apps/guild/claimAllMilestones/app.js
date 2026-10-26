import { postBackendGuildMilestonesClaimAll } from "../../../api/bot/guild-milestone-claim.js";

//#region src/response-apps/guild/claimAllMilestones/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await postBackendGuildMilestonesClaimAll(params.bid, params.uid, params.type, params.request, params.repeatCommand)
		};
	} catch (error) {
		const message = error?.message ?? "一键领取失败";
		return {
			code: error?.code === "GUILD_MILESTONES_NOTHING_TO_CLAIM" ? "NOTHING_TO_CLAIM" : "LOAD_FAILED",
			data: { message }
		};
	}
}

//#endregion
export { App as default };