import { displayCurrencyText } from "../../constants/currency.js";
import { BackendAPIError } from "./client.js";
import { parseBackendActivityPoints } from "./activity-points-queries.js";
import { parseBackendActivityClaim, parseBackendActivityClaimAll } from "./activity-points-claim.js";

//#region src/api/bot/activity-points-robot.ts
function parseRobotActivityPoints(value, type) {
	const data = parseBackendActivityPoints(value, type);
	return {
		currentPoints: data.currentPoints,
		treasureMapsUnavailableReason: data.treasureMapsUnavailableReason,
		taskRewardsCanClaim: data.taskRewardsCanClaim ?? false,
		tasks: data.tasks.map((task) => ({
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
		rewards: data.rewards.map((reward) => ({
			requiredPoints: reward.requiredPoints,
			name: displayCurrencyText(reward.name),
			quantity: reward.quantity,
			category: reward.category,
			claimed: reward.claimed,
			canClaim: reward.canClaim,
			treasureMapQuantity: reward.treasureMapQuantity ?? 0,
			treasureMapGranted: reward.treasureMapGranted === true,
			treasureMapClaimable: reward.treasureMapClaimable === true,
			treasureMapBackfillOnly: reward.treasureMapBackfillOnly === true
		}))
	};
}
function parseRobotActivityClaim(value) {
	const data = parseBackendActivityClaim(value);
	return {
		userName: data.userName,
		requiredPoints: data.requiredPoints,
		treasureMapBackfillOnly: data.treasureMapBackfillOnly === true,
		rewards: data.issued.map((reward) => ({
			name: displayCurrencyText(reward.name),
			amount: reward.amount
		}))
	};
}
function parseRobotActivityClaimAll(value) {
	const data = parseBackendActivityClaimAll(value);
	return {
		userName: data.claimed[0]?.userName ?? data.userName ?? "",
		taskRewards: (data.taskRewards ?? []).map((reward) => ({
			name: displayCurrencyText(reward.name),
			amount: reward.amount
		})),
		partial: data.partial,
		claimed: data.claimed.map((item) => ({
			requiredPoints: item.requiredPoints,
			rewards: item.issued.map((reward) => ({
				name: displayCurrencyText(reward.name),
				amount: reward.amount
			}))
		})),
		...data.error ? { error: data.error } : {}
	};
}
function activityClaimFailureText(error, type, requiredPoints) {
	const label = type === "daily" ? "日常" : "周常";
	if (error instanceof BackendAPIError) {
		const reasons = {
			IDEMPOTENCY_IN_PROGRESS: "操作繁忙，请稍后再试。",
			ACTIVITY_ALREADY_CLAIMED: `${label}活跃度 ${requiredPoints} 点奖励已领取。`,
			ACTIVITY_INSUFFICIENT_POINTS: `${label}活跃度不足，当前活跃度未达到 ${requiredPoints} 点。`,
			ACTIVITY_REWARD_NOT_FOUND: "未找到对应的活跃度奖励配置。",
			NOT_FOUND: "未找到用户信息。"
		};
		if (reasons[error.code]) return reasons[error.code];
	}
	return `领取${label}活跃奖励失败，请稍后再试。`;
}

//#endregion
export { activityClaimFailureText, parseRobotActivityClaim, parseRobotActivityClaimAll, parseRobotActivityPoints };