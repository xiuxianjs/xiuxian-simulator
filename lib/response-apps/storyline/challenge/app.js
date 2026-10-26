import { startBackendStorylineChallenge } from "../../../api/bot/storyline-manual-battle.js";

//#region src/response-apps/storyline/challenge/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await startBackendStorylineChallenge(params.bid, params.uid, params.chapterNumber, params.stageNumber, params.request)
		};
	} catch (error) {
		return {
			code: "FAILED",
			data: { message: error instanceof Error ? error.message : "主线挑战失败" }
		};
	}
}

//#endregion
export { App as default };