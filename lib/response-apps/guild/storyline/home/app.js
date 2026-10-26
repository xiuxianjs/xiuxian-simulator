import { getBackendGuildStorylineHome } from "../../../../api/bot/guild-storyline-actions.js";

//#region src/response-apps/guild/storyline/home/app.ts
async function App(params) {
	try {
		const data = await getBackendGuildStorylineHome(params.bid, params.uid);
		return {
			code: data.home.allCleared ? "ALL_CLEARED" : "OK",
			data: {
				guildId: data.guildId,
				...data.home,
				claimableStages: data.claimableStages
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "加载宗门主线信息失败" }
		};
	}
}

//#endregion
export { App as default };