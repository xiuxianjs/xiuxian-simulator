import { parseBackendRechargeRights } from "../api/bot/recharge-rights-queries.js";
import { parseBackendVipPrivileges } from "../api/bot/vip-privileges-queries.js";
import { boolean, fields, list, number, object, text } from "./schema.js";
import { observation } from "./mutation.js";

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
const membershipActions = {
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