import { getBackendTeams } from "../../../api/bot/queries.js";
import "../../../api/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/teamList/app.ts
async function App(params) {
	try {
		const result = await getBackendTeams(params.bid, params.page, params.pageSize);
		return {
			code: "OK",
			data: {
				teams: result.teams.map((team) => ({
					teamId: team.teamId,
					leaderName: team.leaderName,
					memberCount: team.memberCount,
					maxMembers: team.maxMembers,
					minRealmName: team.minRealmName
				})),
				currentPage: result.currentPage,
				totalPages: result.totalPages,
				total: result.total
			}
		};
	} catch (error) {
		logger.error("查询队伍列表失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
}

//#endregion
export { App as default };