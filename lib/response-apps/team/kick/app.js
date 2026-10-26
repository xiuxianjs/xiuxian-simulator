import { kickBackendTeamMember } from "../../../api/bot/team-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/kick/app.ts
async function App(params) {
	try {
		await kickBackendTeamMember(params.bid, params.targetUid, params.request, params.repeatCommand);
		return { code: "OK" };
	} catch (error) {
		logger.error("踢出队员失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "操作失败" }
		};
	}
}

//#endregion
export { App as default };