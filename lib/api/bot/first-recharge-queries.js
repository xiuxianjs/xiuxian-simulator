import { requestBackend } from "./client.js";

//#region src/api/bot/first-recharge-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("首充信息接口格式不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("首充信息接口缺少文本字段");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("首充信息接口缺少数值字段");
	return value;
}
function names(value) {
	return Object.fromEntries(Object.entries(record(value)).map(([id, name]) => {
		if (!Number.isSafeInteger(Number(id))) throw new Error("首充信息接口名称ID无效");
		return [Number(id), text(name)];
	}));
}
async function getBackendFirstRechargeInfo(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendFirstRechargeInfo(await requestBackend(bid, "get_players_id_recharge_first", { path: { id: uid } }));
}
function parseBackendFirstRechargeInfo(value) {
	const data = record(value);
	const allNames = record(data.names);
	if (!Array.isArray(data.tiers)) throw new Error("首充信息接口缺少档位");
	return {
		names: {
			items: names(allNames.items),
			equipments: names(allNames.equipments),
			skills: names(allNames.skills)
		},
		tiers: data.tiers.map((value) => {
			const tier = record(value);
			if (tier.status !== "locked" && tier.status !== "claimable" && tier.status !== "claimed" || !Array.isArray(tier.rewards)) throw new Error("首充信息接口档位不完整");
			const rewards = tier.rewards.map((value) => {
				const reward = record(value);
				return {
					type: text(reward.type),
					currencyCode: text(reward.currencyCode),
					itemId: number(reward.itemId),
					quantity: number(reward.quantity)
				};
			});
			return {
				tierAmountYuan: number(tier.tierAmountYuan),
				status: tier.status,
				rewards,
				rewardText: text(tier.rewardText)
			};
		})
	};
}

//#endregion
export { getBackendFirstRechargeInfo, parseBackendFirstRechargeInfo };