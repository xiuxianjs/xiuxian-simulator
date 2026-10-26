import { getBackendTeamInfo } from "../../../api/bot/team-info-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/teamInfo/app.ts
async function App(params) {
	try {
		const result = await getBackendTeamInfo(params.bid, params.teamId);
		if (!result.team) return { code: params.teamId ? "TEAM_NOT_FOUND" : "NO_TEAM" };
		if (!result.team.exists) return { code: "TEAM_NOT_FOUND" };
		return {
			code: "OK",
			data: result.team
		};
	} catch (error) {
		logger.error("查询队伍信息失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
}

//#endregion
export { App as default };