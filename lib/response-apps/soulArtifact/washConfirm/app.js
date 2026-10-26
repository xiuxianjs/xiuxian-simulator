import { confirmBackendSoulArtifactWash } from "../../../api/bot/soul-artifact-wash.js";
import { logger } from "alemonjs";

//#region src/response-apps/soulArtifact/washConfirm/app.ts
async function App(params) {
	try {
		const result = await confirmBackendSoulArtifactWash(params.bid, params.uid, params.request);
		return {
			success: true,
			message: result.message,
			pending: result.pending
		};
	} catch (error) {
		logger.error("确认本命物洗涤失败:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "确认本命物洗涤失败"
		};
	}
}

//#endregion
export { App as default };