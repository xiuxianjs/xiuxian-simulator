import { getBackendNewcomerLogin } from "../../../api/bot/newcomer-login-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/activity/newcomerLogin/app.ts
async function App(params) {
	if (!params.uid) return { code: "INVALID_USER" };
	try {
		const status = await getBackendNewcomerLogin(params.bid, params.uid, params.request);
		if (!status.isInPeriod) return {
			code: "OUT_OF_PERIOD",
			message: status.periodMessage
		};
		if (!status.view) throw new Error("新人活动展示投影不完整");
		return {
			code: "OK",
			data: status.view
		};
	} catch (error) {
		logger.error("查询新人狂欢状态失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };