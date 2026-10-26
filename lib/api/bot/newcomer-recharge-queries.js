import { requestBackend } from "./client.js";

//#region src/api/bot/newcomer-recharge-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("新人返利接口格式不完整");
	return value;
}
function integer(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("新人返利接口缺少数值");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("新人返利接口缺少状态");
	return value;
}
function string(value) {
	if (typeof value !== "string") throw new Error("新人返利接口缺少展示内容");
	return value;
}
async function getBackendNewcomerRechargeInfo(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendNewcomerRechargeInfo(await requestBackend(bid, "get_players_id_recharge_newcomer", { path: { id: uid } }));
}
function parseBackendNewcomerRechargeInfo(value) {
	const data = record(value);
	if (!Array.isArray(data.rewards) || !Array.isArray(data.claimedDays)) throw new Error("新人返利接口缺少奖励记录");
	const itemNames = Object.fromEntries(Object.entries(record(data.itemNames)).map(([id, name]) => {
		if (!/^(0|[1-9]\d*)$/.test(id) || !Number.isSafeInteger(Number(id)) || typeof name !== "string") throw new Error("新人返利接口名称无效");
		return [Number(id), name];
	}));
	return {
		contentDays: integer(data.contentDays),
		isInPeriod: boolean(data.isInPeriod),
		daysSinceRegistration: integer(data.daysSinceRegistration),
		currentDay: integer(data.currentDay),
		todayRechargedAmount: integer(data.todayRechargedAmount),
		thresholdAmount: integer(data.thresholdAmount),
		claimedDays: data.claimedDays.map(integer),
		todayRewardClaimed: boolean(data.todayRewardClaimed),
		maxClaimableDay: integer(data.maxClaimableDay),
		itemNames,
		rewards: data.rewards.map((value) => {
			const reward = record(value);
			if (!Array.isArray(reward.items)) throw new Error("新人返利接口缺少物品");
			return {
				day: integer(reward.day),
				spiritStone: integer(reward.spiritStone),
				spiritCrystal: integer(reward.spiritCrystal),
				spiritMilk: integer(reward.spiritMilk),
				claimed: boolean(reward.claimed),
				canClaim: boolean(reward.canClaim),
				rewardText: string(reward.rewardText),
				statusTag: string(reward.statusTag),
				items: reward.items.map((value) => {
					const item = record(value);
					return {
						itemId: integer(item.itemId),
						quantity: integer(item.quantity)
					};
				})
			};
		})
	};
}

//#endregion
export { getBackendNewcomerRechargeInfo, parseBackendNewcomerRechargeInfo };