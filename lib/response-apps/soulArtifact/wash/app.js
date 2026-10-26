import { previewBackendSoulArtifactWash } from "../../../api/bot/soul-artifact-wash.js";
import { logger } from "alemonjs";

//#region src/response-apps/soulArtifact/wash/app.ts
async function App(params) {
	try {
		const result = await previewBackendSoulArtifactWash(params.bid, params.uid, params.times, params.request);
		return {
			code: "PENDING",
			data: {
				totalSuccess: result.pending.totalSuccess,
				times: result.pending.times,
				message: result.pending.finalMessage,
				results: result.pending.results
			}
		};
	} catch (error) {
		logger.error("本命物洗涤失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "洗涤失败" }
		};
	}
}

//#endregion
export { App as default };