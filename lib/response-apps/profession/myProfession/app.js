import { getBackendProfessionDashboard } from "../../../api/bot/profession-dashboard-query.js";
import { logger } from "alemonjs";

//#region src/response-apps/profession/myProfession/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendProfessionDashboard(params.bid, params.uid)
		};
	} catch (error) {
		logger.error("获取职业信息失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };