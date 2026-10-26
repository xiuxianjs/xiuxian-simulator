import { getBackendSeclusionDisplay } from "../../../api/bot/seclusion-status.js";
import { logger } from "alemonjs";

//#region src/response-apps/seclusion/info/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendSeclusionDisplay(params.bid, params.uid)
		};
	} catch (error) {
		logger.error("[探索] 查看错误:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看探索状态失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };