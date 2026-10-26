import { createBackendTeam } from "../../../api/bot/team-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/createTeam/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { teamId: await createBackendTeam(params.bid, params.request, params.repeatCommand) }
		};
	} catch (error) {
		logger.error("创建队伍失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "创建队伍失败" }
		};
	}
}

//#endregion
export { App as default };