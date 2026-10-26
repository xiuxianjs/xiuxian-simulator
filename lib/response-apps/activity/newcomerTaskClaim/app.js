import { claimBackendNewcomerTask } from "../../../api/bot/newcomer-login-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/activity/newcomerTaskClaim/app.ts
async function App(params) {
	if (!params.uid) return { code: "INVALID_USER" };
	if (!Number.isInteger(params.taskConfigId) || params.taskConfigId <= 0) return { code: "INVALID_TASK_ID" };
	try {
		const result = await claimBackendNewcomerTask(params.bid, params.uid, params.taskConfigId, params.request);
		if (result.code === "OK") {
			if (!Number.isFinite(result.spiritCrystal) || !Number.isFinite(result.vipExpYuan)) throw new Error("新人任务领奖响应不完整");
			return {
				code: "OK",
				data: {
					spiritCrystal: result.spiritCrystal,
					vipExpYuan: result.vipExpYuan
				}
			};
		}
		if (result.code === "INSUFFICIENT_PROGRESS") {
			if (typeof result.taskLabel !== "string" || !Number.isFinite(result.required) || !Number.isFinite(result.current) || typeof result.unit !== "string") throw new Error("新人任务进度响应不完整");
			return {
				code: "INSUFFICIENT_PROGRESS",
				data: {
					taskLabel: result.taskLabel,
					required: result.required,
					current: result.current,
					unit: result.unit
				}
			};
		}
		return { code: result.code };
	} catch (error) {
		logger.error("领取新人任务奖励失败:", error);
		return { code: "CLAIM_FAILED" };
	}
}

//#endregion
export { App as default };