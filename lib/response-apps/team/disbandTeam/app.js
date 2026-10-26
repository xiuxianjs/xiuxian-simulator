import { disbandBackendTeam } from "../../../api/bot/team-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/disbandTeam/app.ts
/**
* 解散队伍 App 层
*/
async function App(params) {
	try {
		await disbandBackendTeam(params.bid, params.request, params.repeatCommand);
		return { code: "OK" };
	} catch (error) {
		if (error instanceof Error) logger.info(`解散队伍失败: ${error.message}`);
		else logger.error("解散队伍失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "解散失败" }
		};
	}
}

//#endregion
export { App as default };