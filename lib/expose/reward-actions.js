import { parseBackendActivityPoints } from "../api/bot/activity-points-queries.js";
import { parseBackendActivityClaim, parseBackendActivityClaimAll } from "../api/bot/activity-points-claim.js";
import { parseRobotMonthCardClaim } from "../api/bot/membership-claim.js";
import { validateBackendAchievementClaim } from "../api/bot/achievement-claim.js";
import { validateGuardedAchievement } from "../api/bot/achievement-robot-query.js";
import { boolean, fields, integer, list, object, text } from "./schema.js";
import { mutation } from "./mutation.js";

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
	issued
});
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
	tasks: list(object({
		...fields(integer, "taskId activityPoints targetValue currentValue rewardQuantity"),
		...fields(text, "name description actionKey rewardName"),
		completed: boolean
	})),
	rewards: list(object({
		...fields(integer, "requiredPoints itemId quantity"),
		...fields(text, "name category currencyCode"),
		...fields(boolean, "claimed canClaim")
	}))
}, ["taskRewardsCanClaim"]);
const activityPanel = (type, label) => mutation(`查询${label}活跃任务、周期、积分和可领阈值，沿用服务端准入；不会领取奖励。`, `activity-points.${type}`, empty, activity, () => `/${label}活跃`, (data) => parseBackendActivityPoints(data, type));
const claimActivity = (type, label) => mutation(`领取指定阈值的${label}活跃奖励；requiredPoints 取自活跃面板，服务端校验积分和重复领取。`, `activity-points.claim-${type}`, object({ requiredPoints: points }), claim, (input) => `/领取${label}活跃奖励 ${input.requiredPoints}`, parseBackendActivityClaim, (input) => ({
	mode: "claim",
	requiredPoints: input.requiredPoints
}));
const claimAllActivity = (type, label) => mutation(`领取全部可领${label}活跃奖励及任务奖励；必须检查 partial、claimed 和 error，部分成功不会自动重试。`, `activity-points.claim-all-${type}`, empty, claimAll, () => `/一键领取${label}活跃奖励`, parseBackendActivityClaimAll);
const rewardActions = {
	get_daily_activity: activityPanel("daily", "日常"),
	get_weekly_activity: activityPanel("weekly", "周常"),
	claim_daily_activity: claimActivity("daily", "日常"),
	claim_weekly_activity: claimActivity("weekly", "周常"),
	claim_all_daily_activity: claimAllActivity("daily", "日常"),
	claim_all_weekly_activity: claimAllActivity("weekly", "周常"),
	claim_month_card_rewards: mutation("领取当前角色可领取的月卡每日奖励；不购买月卡。领取结果未知时先核对权益和奖励，不能认为取消请求会回滚发奖。", "membership.claim-month-card", empty, object({
		days: integer,
		rewards: object(fields(integer, "spiritCrystal huanHunDan yangShenDan")),
		status: object(fields(integer, "prepaidCount claimedCount upcomingCount"))
	}), () => "/一键领取月卡", parseRobotMonthCardClaim),
	claim_all_achievements: mutation("领取当前角色全部可领成就奖励，保留服务端境界门槛；locked=true 表示未解锁，即使整体 success=true 也没有发奖。", "achievements.claim-all", empty, object({
		locked: boolean,
		realmName: text,
		data: object({
			claimedCount: integer,
			claimed: list(object(fields(text, "category categoryLabel achievementName rewardText")))
		})
	}, ["realmName", "data"]), () => "/一键领取成就", (data) => validateGuardedAchievement(data, validateBackendAchievementClaim))
};

//#endregion
export { rewardActions };