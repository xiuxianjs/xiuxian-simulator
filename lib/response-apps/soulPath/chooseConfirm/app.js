import { confirmBackendSoulPathChoose } from "../../../api/bot/soul-path-choose.js";
import { logger } from "alemonjs";

//#region src/response-apps/soulPath/chooseConfirm/app.ts
async function App(params) {
	try {
		return {
			success: true,
			data: await confirmBackendSoulPathChoose(params.bid, params.uid, params.token, params.request)
		};
	} catch (error) {
		logger.error("[确认道途选择] 失败:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "确认道途选择失败，请稍后重试。"
		};
	}
}

//#endregion
export { App as default };