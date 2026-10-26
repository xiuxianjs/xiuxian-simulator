import { previewBackendSoulPathChoose } from "../../../api/bot/soul-path-choose.js";
import { logger } from "alemonjs";

//#region src/response-apps/soulPath/choose/app.ts
async function App(params) {
	try {
		return {
			success: true,
			data: await previewBackendSoulPathChoose(params.bid, params.uid, params.pathKey, params.request)
		};
	} catch (error) {
		logger.error("[选择道途] 预览失败:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "选择道途预览失败，请稍后重试。"
		};
	}
}

//#endregion
export { App as default };