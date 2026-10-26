import { displayCurrencyText } from "../../../constants/currency.js";
import { claimBackendLimitedEventTask } from "../../../api/bot/limited-event-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/limitedEvent/taskClaim/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: {
				success: true,
				rewardText: (await claimBackendLimitedEventTask(params.bid, params.uid, params.taskId, params.request)).issued.map((reward) => `${displayCurrencyText(reward.name)}×${reward.amount}`).join("、")
			}
		};
	} catch (error) {
		logger.error("[活动任务领取] 错误:", error);
		if (error?.status === 409 || error?.code === "CONFLICT") return {
			code: "FAIL",
			data: {
				success: false,
				message: error.message ?? "领取失败"
			}
		};
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "领取失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };