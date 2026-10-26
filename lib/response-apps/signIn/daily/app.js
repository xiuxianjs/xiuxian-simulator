import { dailyBackendCheckIn } from "../../../api/bot/daily-checkin.js";
import { presentDailyCheckIn } from "../../../api/bot/signin-robot-query.js";
import { logger } from "alemonjs";

//#region src/response-apps/signIn/daily/app.ts
async function App(params) {
	try {
		const result = await dailyBackendCheckIn(params.bid, params.uid, params.request, params.messageText);
		return presentDailyCheckIn(result);
	} catch (error) {
		logger.error("日常签到失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "日常签到失败，请稍后再试。" }
		};
	}
}

//#endregion
export { App as default };