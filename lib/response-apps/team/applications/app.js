import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendTeamPendingApplications } from "../../../api/bot/queries.js";
import "../../../api/bot/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/applications/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendTeamPendingApplications(params.bid, params.uid)
		};
	} catch (error) {
		if (error instanceof BackendAPIError && (error.status === 404 || error.status === 403)) return {
			code: "LOAD_FAILED",
			data: { message: error.status === 404 ? "你还未加入队伍" : "你不是队长" }
		};
		logger.error("查询队伍申请失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
}

//#endregion
export { App as default };