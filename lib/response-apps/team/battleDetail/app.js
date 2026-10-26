import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendTeamBattleDetail } from "../../../api/bot/queries.js";
import "../../../api/bot/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/battleDetail/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendTeamBattleDetail(params.bid, params.recordId)
		};
	} catch (error) {
		if (error instanceof BackendAPIError && error.status === 404) return { code: "NOT_FOUND" };
		if (error instanceof BackendAPIError && error.status === 403) return {
			code: "LOAD_FAILED",
			data: { message: "你无权查看该队伍战斗记录" }
		};
		logger.error("查询队伍战斗详情失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
}

//#endregion
export { App as default };