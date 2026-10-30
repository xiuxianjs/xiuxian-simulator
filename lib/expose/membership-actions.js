import { parseBackendFirstRechargeInfo } from "../api/bot/first-recharge-queries.js";
import { parseRobotFirstRechargeClaim } from "../api/bot/first-recharge-claim.js";
import { parseBackendNewcomerRechargeInfo } from "../api/bot/newcomer-recharge-queries.js";
import { parseBackendNewcomerRechargeClaim } from "../api/bot/newcomer-recharge-claim.js";
import { WEEKLY_CUMULATIVE_THRESHOLDS } from "../api/schemas/weekly-rebate-query.js";
import { parseBackendWeeklyRebate, weeklyRebateWeekStart } from "../api/bot/weekly-rebate-queries.js";
import { parseRobotWeeklyRebateClaim } from "../api/bot/weekly-rebate-claim.js";
import { parseBackendRechargeRights } from "../api/bot/recharge-rights-queries.js";
import { parseBackendVipPrivileges } from "../api/bot/vip-privileges-queries.js";
import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";

//#region src/expose/membership-actions.ts
const reward = object({
	id: number,
	name: text,
	quantity: number
}, ["name"]);
const pack = object({
	...fields(number, "id priceAmount grantSpiritStone grantSpiritCrystal grantSpiritMilk"),
	items: list(reward),
	skills: list(reward)
});
const daily = object({
	...fields(number, "prepaidCount total claimableCount claimedCount upcomingCount"),
	reviewRequired: boolean,
	calendarState: list(object({
		day: number,
		rewardDate: text,
		state: {
			type: "string",
			enum: [
				"claimed",
				"claimable",
				"upcoming"
			]
		},
		prepaid: boolean
	}, ["prepaid"]))
}, ["prepaidCount", "reviewRequired"]);
const pass = object({
	active: boolean,
	expireTime: text,
	...fields(number, "remainingDays totalDays maxDays"),
	package: pack
}, ["expireTime", "package"]);
const card = object({
	active: boolean,
	expireTime: text,
	...fields(number, "remainingDays totalDays maxDays remainingQuota"),
	daily,
	package: pack
}, ["expireTime", "package"]);
const privilege = object({
	minLevel: number,
	text,
	unlocked: boolean,
	needText: text
}, ["minLevel", "needText"]);
const issued = list(object({
	type: text,
	name: text,
	amount: integer
}));
const day = (maximum) => ({
	type: "integer",
	minimum: 1,
	maximum
});
const commandArgs = (command) => ({ input: command });
function weeklyClaimCommand(input) {
	if (input.kind === "loop") return `/周周返利领取 循环 ${input.expectedWeekStart} ${input.expectedLoopCount}`;
	return `/周周返利领取 ${input.thresholdYuan ?? input.dayIndex}${input.expectedWeekStart ? ` ${input.expectedWeekStart}` : ""}`;
}
function validateWeeklyClaim(input) {
	validateIntentId(input.intentId);
	if (input.expectedWeekStart !== void 0) weeklyRebateWeekStart(input.expectedWeekStart);
	if (input.kind === "loop") {
		if (input.thresholdYuan !== void 0 || input.dayIndex !== void 0 || !input.expectedWeekStart || !Number.isSafeInteger(input.expectedLoopCount) || Number(input.expectedLoopCount) < 1) throw new Error("请先查询本周循环返利，使用原周次及累计可得次数领取");
		return;
	}
	if (input.expectedLoopCount !== void 0 || input.thresholdYuan === void 0 === (input.dayIndex === void 0)) throw new Error("请选择一个周周返利档位");
	if (input.thresholdYuan !== void 0 && !WEEKLY_CUMULATIVE_THRESHOLDS.some((tier) => tier === input.thresholdYuan)) throw new Error("周周返利累充档位无效");
	if (input.dayIndex !== void 0 && (input.kind !== void 0 || !Number.isSafeInteger(input.dayIndex) || input.dayIndex < 1 || input.dayIndex > 8)) throw new Error("旧周返利仅支持原第1至8项，请重新查询当前活动");
}
const membershipActions = {
	get_first_recharge_rewards: observation("查询首充礼包档位、状态及服务端奖励内容；金额单位为元。", "recharge.first-info", object({}), object({ tiers: list(object({
		tierAmountYuan: number,
		status: {
			type: "string",
			enum: [
				"locked",
				"claimable",
				"claimed"
			]
		},
		rewards: list(object({
			type: text,
			currencyCode: text,
			itemId: number,
			quantity: number
		})),
		rewardText: text
	})) }), () => "/礼包奖励", parseBackendFirstRechargeInfo),
	claim_first_recharge_reward: mutation("领取指定首充礼包档位，tierYuan 使用查询结果中的整数元档位；是否符合资格以服务端结果为准。", "recharge.first-claim", object({
		tierYuan: day(Math.floor(Number.MAX_SAFE_INTEGER / 100)),
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		tierYuan: number,
		issued
	}), (input) => `/领取礼包奖励 ${input.tierYuan}`, parseRobotFirstRechargeClaim, (input) => commandArgs(`/领取礼包奖励 ${input.tierYuan}`), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_newcomer_recharge_rebate: observation("查询新人返利周期、充值门槛和各日领取状态；金额字段单位为分。", "recharge.newcomer-info", object({}), object({
		...fields(integer, "contentDays daysSinceRegistration currentDay todayRechargedAmount thresholdAmount maxClaimableDay"),
		...fields(boolean, "isInPeriod todayRewardClaimed"),
		claimedDays: list(integer),
		rewards: list(object({
			...fields(integer, "day spiritStone spiritCrystal spiritMilk"),
			...fields(boolean, "claimed canClaim"),
			...fields(text, "rewardText statusTag"),
			items: list(object({
				itemId: integer,
				quantity: integer
			}))
		}))
	}), () => "/新人返利", parseBackendNewcomerRechargeInfo),
	claim_newcomer_recharge_rebate: mutation("领取新人返利指定天数奖励，服务端检查周期、充值门槛和领取状态。", "recharge.newcomer-claim", object({
		dayIndex: day(14),
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		dayIndex: integer,
		reward: object({
			...fields(integer, "spiritStone spiritCrystal spiritMilk"),
			itemIds: text
		}),
		rewardText: text
	}), (input) => `/新人返利领取 ${input.dayIndex}`, parseBackendNewcomerRechargeClaim, (input) => commandArgs(`/新人返利领取 ${input.dayIndex}`), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_weekly_recharge_rebate: observation("查询周周返利资格、北京时间截止、本周累充档位及循环可领次数；mode为weekly_cumulative时使用新档位，缺少mode表示旧服务端逐日活动；Amount字段为分。", "recharge.weekly-info", object({}), object({
		mode: {
			type: "string",
			enum: ["weekly_cumulative"]
		},
		...fields(boolean, "eligible canClaimToday canClaimBonus"),
		...fields(number, "minAccountDays dailyThresholdAmount daysSinceRegistration todayDayOfWeek todayRechargedAmount todayRechargedYuan thresholdYuan weekRechargedAmount weekRechargedYuan"),
		...fields(text, "todayLabel weekStart todayRechargeText rulesVersion periodStart periodEnd deadlineText weekRechargeText"),
		claimedDays: list(number),
		claimedAmounts: list(integer),
		loop: object({
			...fields(integer, "baseAmount stepAmount itemId quantity totalCount claimedCount claimableCount expectedLoopCount"),
			...fields(text, "name statusTag rewardText"),
			...fields(boolean, "canClaim configured")
		}),
		rewards: list(object({
			...fields(number, "day spiritStone spiritCrystal spiritMilk thresholdAmount thresholdYuan remainingAmount"),
			...fields(text, "label statusTag rewardText remainingText"),
			...fields(boolean, "canClaim configured claimed"),
			items: list(object({
				itemId: number,
				quantity: number,
				name: text
			}, ["name"]))
		}, [
			"day",
			"thresholdAmount",
			"thresholdYuan",
			"remainingAmount",
			"remainingText",
			"configured",
			"claimed"
		]))
	}, [
		"mode",
		"canClaimToday",
		"canClaimBonus",
		"dailyThresholdAmount",
		"todayDayOfWeek",
		"todayRechargedAmount",
		"todayRechargedYuan",
		"thresholdYuan",
		"todayLabel",
		"todayRechargeText",
		"claimedDays",
		"rulesVersion",
		"periodStart",
		"periodEnd",
		"deadlineText",
		"weekRechargeText",
		"weekRechargedAmount",
		"weekRechargedYuan",
		"claimedAmounts",
		"loop"
	]), () => "/周周返利", parseBackendWeeklyRebate),
	claim_weekly_recharge_rebate: mutation("领取本周累充30/68/128/198/328/488/648元档；循环需kind=loop及查询返回的expectedWeekStart和expectedLoopCount，一次领取当前未领次数。dayIndex仅兼容旧服务端原1至8项，不代表新档位。", "recharge.weekly-rebate-claim", object({
		kind: {
			type: "string",
			enum: ["tier", "loop"]
		},
		thresholdYuan: integer,
		dayIndex: day(8),
		expectedWeekStart: text,
		expectedLoopCount: integer,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, [
		"kind",
		"thresholdYuan",
		"dayIndex",
		"expectedWeekStart",
		"expectedLoopCount",
		"intentId",
		"taskInput"
	]), object({
		dayIndex: integer,
		mode: {
			type: "string",
			enum: ["weekly_cumulative"]
		},
		kind: {
			type: "string",
			enum: ["tier", "loop"]
		},
		delivery: {
			type: "string",
			enum: ["inventory", "mail"]
		},
		...fields(text, "rulesVersion weekStart label"),
		...fields(integer, "thresholdAmount thresholdYuan fromCount toCount claimedCount"),
		issued
	}, [
		"dayIndex",
		"mode",
		"kind",
		"rulesVersion",
		"weekStart",
		"label",
		"thresholdAmount",
		"thresholdYuan",
		"fromCount",
		"toCount",
		"claimedCount",
		"delivery"
	]), weeklyClaimCommand, parseRobotWeeklyRebateClaim, (input) => commandArgs(weeklyClaimCommand(input)), validateWeeklyClaim, {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_membership_rights: observation("查询本人权益、月卡到期与每日奖励状态、探索通行证和充值进度；金额单位为分。reviewRequired 表示奖励状态需要核对，不领取或购买。", "membership.rights", object({}), object({
		name: text,
		...fields(number, "vipLevel totalRechargeAmount nextVipLevel nextVipThreshold"),
		firstRechargeTime: text,
		monthCard: card,
		seclusionPass: pass,
		...fields(boolean, "canUseMeridian canUseSoulPath"),
		progressText: text,
		monthCardInstantRewards: list(text),
		seclusionPriceText: text,
		seclusionRewards: list(text)
	}, [
		"nextVipLevel",
		"nextVipThreshold",
		"firstRechargeTime"
	]), () => "/我的权益", (data) => {
		const result = parseBackendRechargeRights(data);
		const raw = data.monthCard.daily;
		const { prepaidCount, reviewRequired, calendarState, ...rest } = result.monthCard.daily;
		return {
			...result,
			monthCard: {
				...result.monthCard,
				daily: {
					...rest,
					...typeof raw.prepaidCount === "number" ? { prepaidCount } : {},
					...typeof raw.reviewRequired === "boolean" ? { reviewRequired } : {},
					calendarState: calendarState.map((row, i) => {
						const { prepaid, ...other } = row;
						return {
							...other,
							...typeof raw.calendarState[i]?.prepaid === "boolean" ? { prepaid } : {}
						};
					})
				}
			}
		};
	}),
	execute_task_membership_rights: mutation("查询本人权益、月卡到期与每日奖励状态、探索通行证和充值进度；金额单位为分。reviewRequired 表示奖励状态需要核对，不领取或购买。", "membership.rights", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), object({
		name: text,
		...fields(number, "vipLevel totalRechargeAmount nextVipLevel nextVipThreshold"),
		firstRechargeTime: text,
		monthCard: card,
		seclusionPass: pass,
		...fields(boolean, "canUseMeridian canUseSoulPath"),
		progressText: text,
		monthCardInstantRewards: list(text),
		seclusionPriceText: text,
		seclusionRewards: list(text)
	}, [
		"nextVipLevel",
		"nextVipThreshold",
		"firstRechargeTime"
	]), () => "/我的权益", (data) => {
		const result = parseBackendRechargeRights(data);
		const raw = data.monthCard.daily;
		const { prepaidCount, reviewRequired, calendarState, ...rest } = result.monthCard.daily;
		return {
			...result,
			monthCard: {
				...result.monthCard,
				daily: {
					...rest,
					...typeof raw.prepaidCount === "number" ? { prepaidCount } : {},
					...typeof raw.reviewRequired === "boolean" ? { reviewRequired } : {},
					calendarState: calendarState.map((row, i) => {
						const { prepaid, ...other } = row;
						return {
							...other,
							...typeof raw.calendarState[i]?.prepaid === "boolean" ? { prepaid } : {}
						};
					})
				}
			}
		};
	}, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_membership_privileges: observation("查询本人 VIP 和月卡特权、等级资格、签到加倍日期及每日丹药限制；金额单位为分，特权开放状态以服务端为准。", "membership.privileges", object({}), object({
		found: boolean,
		name: text,
		...fields(number, "vipLevel totalRechargeAmount pillDailyLimit"),
		...fields(boolean, "hasMonthCard canUseMeridian canUseSoulPath"),
		levelEligibility: list(object({
			minLevel: number,
			unlocked: boolean,
			needAmount: number
		})),
		checkinDoubleDays: list(object({
			key: text,
			days: list(number)
		})),
		vipPrivileges: list(privilege),
		monthCardPrivileges: list(privilege)
	}), () => "/我的特权", (data) => {
		const result = parseBackendVipPrivileges(data);
		return {
			...result,
			checkinDoubleDays: Object.entries(result.checkinDoubleDays).map(([key, days]) => ({
				key,
				days
			}))
		};
	})
};

//#endregion
export { membershipActions };