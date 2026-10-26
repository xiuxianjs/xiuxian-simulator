import { approveBackendTeamApplication } from "../../../api/bot/team-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/approve/app.ts
async function App(params) {
	try {
		await approveBackendTeamApplication(params.bid, params.applicationId, params.request, params.repeatCommand);
		return { code: "OK" };
	} catch (error) {
		logger.error("同意队伍申请失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "操作失败" }
		};
	}
}

//#endregion
export { App as default };