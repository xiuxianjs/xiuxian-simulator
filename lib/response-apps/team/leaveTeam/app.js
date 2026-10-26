import { leaveBackendTeam } from "../../../api/bot/team-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/leaveTeam/app.ts
async function App(params) {
	try {
		await leaveBackendTeam(params.bid, params.request, params.repeatCommand);
		return { code: "OK" };
	} catch (error) {
		logger.error("离开队伍失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "离开失败" }
		};
	}
}

//#endregion
export { App as default };