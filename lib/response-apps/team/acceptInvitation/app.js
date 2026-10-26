import { acceptBackendTeamInvitation } from "../../../api/bot/team-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/acceptInvitation/app.ts
/**
* 接受队伍邀请
* @param params.uid 被邀请者uid
* @param params.invitationId 邀请记录id
*/
async function App(params) {
	try {
		await acceptBackendTeamInvitation(params.bid, params.invitationId, params.request, params.repeatCommand);
		return { code: "OK" };
	} catch (error) {
		if (!(error instanceof Error)) logger.error("接受邀请失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "操作失败" }
		};
	}
}

//#endregion
export { App as default };