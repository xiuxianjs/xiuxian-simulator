import { rejectBackendTeamInvitation } from "../../../api/bot/team-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/rejectInvitation/app.ts
/**
* 拒绝队伍邀请
* @param params.uid 被邀请者uid
* @param params.invitationId 邀请记录id
*/
async function App(params) {
	try {
		await rejectBackendTeamInvitation(params.bid, params.invitationId, params.request, params.repeatCommand);
		return { code: "OK" };
	} catch (error) {
		if (!(error instanceof Error)) logger.error("拒绝邀请失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "操作失败" }
		};
	}
}

//#endregion
export { App as default };