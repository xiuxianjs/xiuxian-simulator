import { newcomerBackendCheckIn } from "../../../api/bot/daily-checkin.js";
import { presentNewcomerCheckIn } from "../../../api/bot/signin-robot-query.js";
import { logger } from "alemonjs";

//#region src/response-apps/signIn/newcomer/app.ts
async function App(params) {
	try {
		const result = await newcomerBackendCheckIn(params.bid, params.uid, params.request, params.messageText);
		return presentNewcomerCheckIn(result);
	} catch (error) {
		logger.error("新人签到失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "新人签到失败，请稍后再试。" }
		};
	}
}

//#endregion
export { App as default };