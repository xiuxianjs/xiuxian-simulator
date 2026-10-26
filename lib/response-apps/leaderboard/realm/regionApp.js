import { getBackendRealmRanking } from "../../../api/bot/realm-ranking-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/leaderboard/realm/regionApp.ts
async function App(params) {
	try {
		const result = await getBackendRealmRanking(params.bid, params.uid, true);
		if (!result.canUseFifthLayerFeature) return {
			code: "LOCKED",
			data: { realmName: result.realmName ?? "未知" }
		};
		if (!result.region) return {
			code: "NO_REGION",
			data: { message: "你当前没有归属区，无法查看区排行。" }
		};
		return {
			code: "OK",
			data: {
				...result,
				canUseSpar: result.canUseSpar
			}
		};
	} catch (error) {
		logger.error("[区境界排行榜] 错误:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看区境界排行榜失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };