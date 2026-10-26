import { BackendAPIError } from "../../../api/bot/client.js";
import { upgradeBackendSoulArtifactLevel } from "../../../api/bot/soul-artifact-upgrade.js";
import { logger } from "alemonjs";

//#region src/response-apps/soulArtifact/upgrade/app.ts
async function App(params) {
	try {
		const result = await upgradeBackendSoulArtifactLevel(params.bid, params.uid, params.levels, params.request, params.messageText);
		return {
			code: "OK",
			data: {
				success: true,
				message: result.message,
				actualLevels: result.actualLevels,
				compareLines: result.compareLines
			}
		};
	} catch (error) {
		if (error instanceof BackendAPIError) return {
			code: "FAILED",
			data: {
				success: false,
				message: error.message
			}
		};
		logger.error("本命物升级失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "升级失败" }
		};
	}
}

//#endregion
export { App as default };