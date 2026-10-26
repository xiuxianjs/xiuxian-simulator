import { previewBackendSoulPathAction } from "../../../api/bot/soul-path-action.js";
import { logger } from "alemonjs";

//#region src/response-apps/soulPath/action/app.ts
async function App(params) {
	try {
		return {
			success: true,
			data: await previewBackendSoulPathAction(params.bid, params.uid, params.action, params.pathKey, params.request)
		};
	} catch (error) {
		logger.error("[道途操作] 预览失败:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "道途操作预览失败，请稍后重试。"
		};
	}
}

//#endregion
export { App as default };