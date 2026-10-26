import { confirmBackendSoulPathAction } from "../../../api/bot/soul-path-action.js";
import { logger } from "alemonjs";

//#region src/response-apps/soulPath/actionConfirm/app.ts
async function App(params) {
	try {
		return {
			success: true,
			data: await confirmBackendSoulPathAction(params.bid, params.uid, params.token, params.request)
		};
	} catch (error) {
		logger.error("[确认道途操作] 失败:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "确认道途操作失败，请稍后重试。"
		};
	}
}

//#endregion
export { App as default };