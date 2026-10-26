import { challengeBackendGuildStoryline } from "../../../../api/bot/guild-storyline-actions.js";

//#region src/response-apps/guild/storyline/challenge/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await challengeBackendGuildStoryline(params.bid, params.uid, params.request, params.repeatCommand)
		};
	} catch (error) {
		return {
			code: "FAILED",
			data: { message: error instanceof Error ? error.message : "宗门主线挑战失败" }
		};
	}
}

//#endregion
export { App as default };