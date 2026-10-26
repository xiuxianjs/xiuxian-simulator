import { getBackendTeamMatchSnapshot } from "../../../api/bot/team-match-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/teamMatch/status/app.ts
async function App(params) {
	try {
		const result = await getBackendTeamMatchSnapshot(params.bid);
		if (!result) return { code: "NO_MATCH" };
		return {
			code: "OK",
			data: {
				targetLabel: result.targetLabel,
				waitedSeconds: result.waitedSeconds,
				timeoutSeconds: result.timeoutSeconds,
				strategyText: {
					WAITING: "等待同目标修士进入匹配池",
					SAME_REALM: "仅匹配同大境界修士",
					ADJACENT_REALM: "优先同大境界，其次相邻大境界",
					NEAREST_REALM: "放宽到同目标副本的最近大境界修士"
				}[result.phase]
			}
		};
	} catch (error) {
		logger.error("查询匹配状态失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询匹配状态失败" }
		};
	}
}

//#endregion
export { App as default };