import { applyBackendTeam } from "../../../api/bot/team-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/joinTeam/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await applyBackendTeam(params.bid, params.teamId, params.request, params.repeatCommand)
		};
	} catch (error) {
		if (error instanceof Error) logger.info(`加入队伍失败: ${error.message}`);
		else logger.error("加入队伍失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "申请失败" }
		};
	}
}

//#endregion
export { App as default };