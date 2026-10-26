import { getBackendCompetitionHome } from "../../../api/bot/competition-read-projections.js";

//#region src/response-apps/guildCompetition/home/app.ts
async function App(params) {
	try {
		const data = await getBackendCompetitionHome(params.bid, params.uid);
		return {
			code: data.hasGuild ? "OK" : "NO_GUILD",
			data
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "获取宗门大比信息失败" }
		};
	}
}

//#endregion
export { App as default };