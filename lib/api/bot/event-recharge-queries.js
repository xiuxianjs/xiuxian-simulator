import { requestBackend } from "./client.js";

//#region src/api/bot/event-recharge-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("活动充值数据不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("活动充值数值字段不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("活动充值文本字段不完整");
	return value;
}
function array(value) {
	if (!Array.isArray(value)) throw new Error("活动充值列表字段不完整");
	return value;
}
async function getBackendEventRecharge(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendEventRecharge(await requestBackend(bid, "get_players_id_limited_events_recharge_packages", { path: { id: uid } }));
}
function parseBackendEventRecharge(value) {
	return array(value).map((value) => {
		const row = record(value);
		return {
			eventId: number(row.eventId),
			eventTitle: text(row.eventTitle),
			subActivityId: number(row.subActivityId),
			subTitle: text(row.subTitle),
			packages: array(row.packages).map((value) => {
				const tier = record(value);
				const rewardTextParts = array(tier.rewardTextParts);
				if (rewardTextParts.some((part) => typeof part !== "string")) throw new Error("活动充值奖励描述不完整");
				return {
					tierId: number(tier.tierId),
					tierLevel: number(tier.tierLevel),
					rechargeAmountFen: number(tier.rechargeAmountFen),
					roundedYuanText: text(tier.roundedYuanText),
					limitPerUser: number(tier.limitPerUser),
					limitText: text(tier.limitText),
					boughtCount: number(tier.boughtCount),
					rewardTextParts
				};
			})
		};
	});
}

//#endregion
export { getBackendEventRecharge, parseBackendEventRecharge };