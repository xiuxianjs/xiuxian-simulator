import { upgradeBackendSoulArtifactGrade } from "../../../api/bot/soul-artifact-grade-upgrade.js";
import { logger } from "alemonjs";

//#region src/response-apps/soulArtifact/gradeUp/app.ts
async function App(params) {
	try {
		const result = await upgradeBackendSoulArtifactGrade(params.bid, params.uid, params.instanceId, params.request);
		return {
			code: "OK",
			data: { message: `「${result.artifact.name}」升品成功：${result.previousGradeName} → ${result.newGradeName}（消耗同名${result.previousGradeName}本命物 ×${result.consumed}）` }
		};
	} catch (error) {
		logger.error("本命物升品失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "升品失败" }
		};
	}
}

//#endregion
export { App as default };