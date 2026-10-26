import { rejectBackendTeamApplication } from "../../../api/bot/team-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/reject/app.ts
async function App(params) {
	try {
		await rejectBackendTeamApplication(params.bid, params.applicationId, params.request, params.repeatCommand);
		return { code: "OK" };
	} catch (error) {
		logger.error("拒绝队伍申请失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "操作失败" }
		};
	}
}

//#endregion
export { App as default };