import { refreshBackendTeamInvitations } from "../../../api/bot/team-invitation-inbox.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/myInvitations/app.ts
/**
* 获取我的队伍邀请列表
* @param params.uid 被邀请者uid
*/
async function App(params) {
	try {
		const result = await refreshBackendTeamInvitations(params.bid, params.uid, params.request);
		if (!result.access.ok) return {
			code: "LOCKED",
			data: { realmName: result.access.realmName ?? "未知" }
		};
		const invitations = result.invitations.map((row) => ({
			...row,
			leaderName: row.leaderName ?? "未知",
			inviterName: row.inviterName ?? "未知",
			createdAt: row.createdAt
		}));
		return {
			code: "OK",
			data: {
				invitations,
				message: invitations.length === 0 ? "暂无待处理的队伍邀请" : void 0
			}
		};
	} catch (error) {
		if (!(error instanceof Error)) logger.error("获取邀请列表失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
}

//#endregion
export { App as default };