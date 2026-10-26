import { startBackendMainlineMatch } from "../../../api/bot/team-match-start.js";
import { logger } from "alemonjs";

//#region src/response-apps/teamMatch/startMainline/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await startBackendMainlineMatch(params.bid, params.chapterNumber, params.stageNumber, params.request)
		};
	} catch (error) {
		logger.error("发起主线匹配失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "发起匹配失败" }
		};
	}
}

//#endregion
export { App as default };