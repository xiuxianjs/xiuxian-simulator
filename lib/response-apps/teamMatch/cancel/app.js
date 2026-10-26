import { cancelBackendTeamMatch } from "../../../api/bot/team-match-cancel.js";
import { logger } from "alemonjs";

//#region src/response-apps/teamMatch/cancel/app.ts
async function App(params) {
	try {
		const result = await cancelBackendTeamMatch(params.bid, params.request);
		if (!result.cancelled) return { code: "NO_MATCH" };
		return {
			code: "OK",
			data: { targetLabel: result.targetLabel }
		};
	} catch (error) {
		logger.error("取消匹配失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "取消匹配失败" }
		};
	}
}

//#endregion
export { App as default };