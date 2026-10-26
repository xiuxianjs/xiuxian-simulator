import { MSG_TEAM } from "../../../constants/messages.js";
import { cancelBackendTeamInvitation } from "../../../api/bot/team-invitation-cancel.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/cancelInvitation/app.ts
/**
* 取消队伍邀请
* @param params.uid 取消者uid
* @param params.invitationId 邀请记录id
*/
async function App(params) {
	try {
		const result = await cancelBackendTeamInvitation(params.bid, params.invitationId, params.request, params.repeatCommand);
		if (result.outcome !== "cancelled") return {
			code: "LOAD_FAILED",
			data: { message: {
				not_in_team: MSG_TEAM.NOT_IN_TEAM,
				not_leader: MSG_TEAM.NOT_LEADER,
				not_found: MSG_TEAM.INVITATION_NOT_FOUND
			}[result.outcome] }
		};
		return { code: "OK" };
	} catch (error) {
		if (!(error instanceof Error)) logger.error("取消邀请失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "操作失败" }
		};
	}
}

//#endregion
export { App as default };