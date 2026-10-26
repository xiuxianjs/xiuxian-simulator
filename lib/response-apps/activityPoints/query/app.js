import { displayCurrencyText } from "../../../constants/currency.js";
import { getBackendActivityPoints } from "../../../api/bot/activity-points-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/activityPoints/query/app.ts
async function App(params) {
	if (!params.uid) return { code: "INVALID_USER" };
	try {
		const rewardInfo = await getBackendActivityPoints(params.bid, params.uid, params.type);
		const tasks = rewardInfo.tasks;
		return {
			code: "OK",
			data: {
				currentPoints: rewardInfo.currentPoints,
				tasks: tasks.map((task) => ({
					taskId: task.taskId,
					name: task.name,
					description: task.description,
					activityPoints: task.activityPoints,
					targetValue: task.targetValue,
					currentValue: task.currentValue,
					completed: task.completed,
					rewardName: task.rewardName ?? "",
					rewardQuantity: task.rewardQuantity
				})),
				rewards: rewardInfo.rewards.map((reward) => ({
					requiredPoints: reward.requiredPoints,
					name: displayCurrencyText(reward.name),
					quantity: reward.quantity,
					category: reward.category,
					claimed: reward.claimed,
					canClaim: reward.canClaim
				}))
			}
		};
	} catch (error) {
		logger.error(`查看${params.type === "daily" ? "日常" : "周常"}活跃失败:`, error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };