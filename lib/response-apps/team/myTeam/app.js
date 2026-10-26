import { getBackendTeamOverview } from "../../../api/bot/team-info-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/myTeam/app.ts
async function App(params) {
	try {
		const result = await getBackendTeamOverview(params.bid, params.uid);
		if (!result.access.ok) return {
			code: "LOCKED",
			data: { realmName: result.access.realmName }
		};
		if (!result.team) return { code: "NO_TEAM" };
		return {
			code: "OK",
			data: {
				...result.team,
				isLeader: result.team.ownMembershipLeader
			}
		};
	} catch (error) {
		logger.error("查询我的队伍失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
}

//#endregion
export { App as default };