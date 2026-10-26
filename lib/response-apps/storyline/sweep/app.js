import { sweepBackendStoryline } from "../../../api/bot/storyline-sweep.js";

//#region src/response-apps/storyline/sweep/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await sweepBackendStoryline(params.bid, params.uid, params.chapterNumber, params.stageNumber, params.times, params.request, params.messageText)
		};
	} catch (error) {
		return {
			code: "FAILED",
			data: { message: error instanceof Error ? error.message : "主线扫荡失败" }
		};
	}
}

//#endregion
export { App as default };