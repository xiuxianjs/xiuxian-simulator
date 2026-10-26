import { getBackendTeamBattleRecords } from "../../../api/bot/queries.js";
import "../../../api/bot/index.js";
import { PAGE_SIZE } from "../../../constants/common.js";
import "../../../constants/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/battleRecords/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendTeamBattleRecords(params.bid, params.page, 5)
		};
	} catch (error) {
		logger.error("查询队伍战斗记录失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
}

//#endregion
export { App as default };