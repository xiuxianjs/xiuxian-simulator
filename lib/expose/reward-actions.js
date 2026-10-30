import { boolean, fields, integer, list, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";
import { validateGuardedAchievement } from "../api/bot/achievement-robot-query.js";
import { validateBackendAchievementClaim } from "../api/bot/achievement-claim.js";
import { parseBackendActivityPoints } from "../api/bot/activity-points-queries.js";
import { parseBackendActivityClaim, parseBackendActivityClaimAll } from "../api/bot/activity-points-claim.js";
import { parseRobotMonthCardClaim } from "../api/bot/membership-claim.js";
import { ExposeError } from "alemonjs";

//#region src/expose/reward-actions.ts
const empty = object({});
const points = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const issued = list(object({
	type: text,
	name: text,
	amount: integer
}));
const claim = object({
	userName: text,
	requiredPoints: integer,
	issued,
	treasureMapBackfillOnly: boolean,
	treasureMapsUnavailableReason: text,
	treasureMaps: object({
		week: text,
		requiredPoints: integer,
		itemId: integer,
		quantity: integer,
		alreadyGranted: boolean,
		configVersion: text
	})
}, [
	"treasureMapBackfillOnly",
	"treasureMaps",
	"treasureMapsUnavailableReason"
]);
const claimAll = object({
	claimed: list(claim),
	partial: boolean,
	userName: text,
	taskRewards: issued,
	error: text
}, [
	"userName",
	"taskRewards",
	"error"
]);
const activity = object({
	rewardType: {
		type: "string",
		enum: ["daily", "weekly"]
	},
	cyclePeriod: text,
	currentPoints: integer,
	taskRewardsCanClaim: boolean,
	treasureMapsUnavailableReason: text,
	weeklyTreasureMaps: list(object({
		...fields(integer, "requiredPoints quantity grantedQuantity"),
		...fields(boolean, "boxClaimed granted claimable backfillOnly")
	})),
	tasks: list(object({
		...fields(integer, "taskId activityPoints targetValue currentValue rewardQuantity"),
		...fields(text, "name description actionKey rewardName"),
		completed: boolean
	})),
	rewards: list(object({
		...fields(integer, "requiredPoints itemId quantity"),
		...fields(text, "name category currencyCode"),
		...fields(boolean, "claimed canClaim treasureMapGranted treasureMapClaimable treasureMapBackfillOnly"),
		treasureMapQuantity: integer
	}, [
		"treasureMapGranted",
		"treasureMapClaimable",
		"treasureMapBackfillOnly",
		"treasureMapQuantity"
	]))
}, [
	"taskRewardsCanClaim",
	"treasureMapsUnavailableReason",
	"weeklyTreasureMaps"
]);
const activityPanel = (type, label) => observation(`查询${label}活跃任务、周期、积分和可领阈值，沿用服务端准入；不会领取奖励。`, `activity-points.${type}`, empty, activity, () => `/${label}活跃`, (data) => parseBackendActivityPoints(data, type));
const taskActivityPanel = (type, label) => mutation(`执行连锁任务中的“${label}活跃”步骤，返回活跃任务和任务推进回执；服务端先推进任务再查询，分别检查两者结果。新操作使用新 intentId，同次重试沿用原编号。`, `activity-points.${type}`, object({
	taskInput: taskInputSchema,
	intentId: intentIdSchema
}, ["intentId"]), activity, () => `/${label}活跃`, (data) => parseBackendActivityPoints(data, type), () => ({}), (input) => validateIntentId(input.intentId), {
	intentId: (input) => input.intentId,
	taskInput: (input) => input.taskInput
});
const claimActivity = (type, label) => mutation(`领取指定阈值的${label}活跃奖励；requiredPoints 取自活跃面板，服务端校验积分和重复领取。`, `activity-points.claim-${type}`, object({
	requiredPoints: points,
	intentId: intentIdSchema,
	taskInput: taskInputSchema
}, ["intentId", "taskInput"]), claim, (input) => `/领取${label}活跃奖励 ${input.requiredPoints}`, parseBackendActivityClaim, (input) => ({
	mode: "claim",
	requiredPoints: input.requiredPoints
}), (input) => validateIntentId(input.intentId), {
	intentId: (input) => input.intentId,
	taskInput: (input) => input.taskInput
});
const claimAllActivity = (type, label) => mutation(`领取全部可领${label}活跃奖励及任务奖励；必须检查 partial、claimed 和 error，部分成功或结果未知先核对再决定后续操作。同消息中新的领取使用新 intentId，重试原请求沿用原编号。连锁任务可传入一致的 taskInput，分别检查任务和领取回执。`, `activity-points.claim-all-${type}`, object({
	intentId: intentIdSchema,
	taskInput: taskInputSchema
}, ["intentId", "taskInput"]), claimAll, (input) => {
	if (input.taskInput === void 0) return `/一键领取${label}活跃奖励`;
	const command = input.taskInput.trim().replace(/^[!！/#＃]\s*/, "").trim();
	if (![`一键领取${label}活跃奖励`, `领取全部${label}活跃奖励`].includes(command)) throw new ExposeError("INVALID_INPUT", "活跃奖励任务指令与奖励周期不匹配");
	return `/${command}`;
}, parseBackendActivityClaimAll, () => ({}), (input) => validateIntentId(input.intentId), {
	intentId: (input) => input.intentId,
	taskInput: (input) => input.taskInput
});
function monthCardCommand(input) {
	if (input.taskInput === void 0) return "/一键领取月卡";
	const command = input.taskInput.trim().replace(/^[!！/#＃]\s*/, "").trim();
	if (![
		"月卡领取",
		"月卡签到",
		"一键领取",
		"一键领取月卡"
	].includes(command)) throw new ExposeError("INVALID_INPUT", "月卡领取任务指令不匹配");
	return `/${command}`;
}
const rewardActions = {
	get_daily_activity: activityPanel("daily", "日常"),
	get_weekly_activity: activityPanel("weekly", "周常"),
	execute_task_daily_activity: taskActivityPanel("daily", "日常"),
	execute_task_weekly_activity: taskActivityPanel("weekly", "周常"),
	claim_daily_activity: claimActivity("daily", "日常"),
	claim_weekly_activity: claimActivity("weekly", "周常"),
	claim_all_daily_activity: claimAllActivity("daily", "日常"),
	claim_all_weekly_activity: claimAllActivity("weekly", "周常"),
	claim_month_card_rewards: mutation("领取当前角色可领取的月卡每日奖励；不购买月卡。领取结果未知时先核对权益和奖励，不能认为取消请求会回滚发奖。", "membership.claim-month-card", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		days: integer,
		rewards: object(fields(integer, "spiritCrystal huanHunDan yangShenDan")),
		status: object(fields(integer, "prepaidCount claimedCount upcomingCount"))
	}), monthCardCommand, parseRobotMonthCardClaim, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	claim_all_achievements: mutation("领取当前角色全部可领成就奖励，保留服务端境界门槛；locked=true 表示未解锁，即使整体 success=true 也没有发奖。同消息中新的领取使用新 intentId，重试原请求沿用原编号。 连锁任务可传入一致的 taskInput，分别检查任务和领取回执。", "achievements.claim-all", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		locked: boolean,
		realmName: text,
		data: object({
			claimedCount: integer,
			claimed: list(object(fields(text, "category categoryLabel achievementName rewardText")))
		})
	}, ["realmName", "data"]), (input) => {
		if (input.taskInput === void 0) return "/一键领取成就";
		const command = input.taskInput.trim().replace(/^[!！/#＃]\s*/, "").trim().replace(/\s+/g, " ");
		if (!["一键领取成就", "成就 一键领取"].includes(command)) throw new ExposeError("INVALID_INPUT", "成就领取任务指令不匹配");
		return `/${command}`;
	}, (data) => validateGuardedAchievement(data, validateBackendAchievementClaim), () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	})
};

//#endregion
export { rewardActions };