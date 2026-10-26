import { getBackendSoulArtifactOverview } from "../../../api/bot/soul-artifact-overview-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/soulArtifact/detail/app.ts
async function App(params) {
	try {
		const facts = await getBackendSoulArtifactOverview(params.bid, params.uid);
		const artifact = facts.items.find((item) => item.instanceId === params.instanceId);
		if (!artifact) return {
			code: "NOT_FOUND",
			data: { message: "未找到该本命物，可能已不存在或不属于你" }
		};
		return {
			code: "OK",
			data: {
				...artifact,
				maxLevel: facts.maxLevel
			}
		};
	} catch (error) {
		logger.error("本命物详情查询失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
}

//#endregion
export { App as default };