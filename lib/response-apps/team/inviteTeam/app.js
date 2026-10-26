import { inviteBackendTeam } from "../../../api/bot/team-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/inviteTeam/app.ts
/**
* 邀请入队
* @param params.uid 邀请者uid
* @param params.targetUid 被邀请者uid
*/
async function App(params) {
	try {
		return {
			code: "OK",
			data: await inviteBackendTeam(params.bid, params.targetUid, params.request, params.repeatCommand)
		};
	} catch (error) {
		if (!(error instanceof Error)) logger.error("邀请入队失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "邀请失败" }
		};
	}
}

//#endregion
export { App as default };