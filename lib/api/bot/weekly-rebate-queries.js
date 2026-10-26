import { requestBackend } from "./client.js";

//#region src/api/bot/weekly-rebate-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("周周返利数据不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("周周返利缺少数值字段");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("周周返利缺少状态字段");
	return value;
}
function array(value) {
	if (!Array.isArray(value)) throw new Error("周周返利缺少列表");
	return value;
}
function string(value) {
	if (typeof value !== "string") throw new Error("周周返利缺少展示字段");
	return value;
}
async function getBackendWeeklyRebate(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendWeeklyRebate(await requestBackend(bid, "get_players_id_recharge_weekly_rebate", { path: { id: uid } }));
}
function parseBackendWeeklyRebate(value) {
	const data = record(value);
	if (typeof data.weekStart !== "string") throw new Error("周周返利缺少周期");
	return {
		eligible: boolean(data.eligible),
		minAccountDays: number(data.minAccountDays),
		dailyThresholdAmount: number(data.dailyThresholdAmount),
		daysSinceRegistration: number(data.daysSinceRegistration),
		todayDayOfWeek: number(data.todayDayOfWeek),
		todayLabel: string(data.todayLabel),
		weekStart: data.weekStart,
		todayRechargedAmount: number(data.todayRechargedAmount),
		todayRechargedYuan: number(data.todayRechargedYuan),
		todayRechargeText: string(data.todayRechargeText),
		thresholdYuan: number(data.thresholdYuan),
		claimedDays: array(data.claimedDays).map(number),
		canClaimToday: boolean(data.canClaimToday),
		canClaimBonus: boolean(data.canClaimBonus),
		rewards: array(data.rewards).map((value) => {
			const row = record(value);
			return {
				day: number(row.day),
				label: string(row.label),
				statusTag: string(row.statusTag),
				spiritStone: number(row.spiritStone),
				spiritCrystal: number(row.spiritCrystal),
				spiritMilk: number(row.spiritMilk),
				canClaim: boolean(row.canClaim),
				rewardText: string(row.rewardText),
				items: array(row.items).map((value) => {
					const item = record(value);
					if (item.name !== null && typeof item.name !== "string") throw new Error("周周返利物品名称不完整");
					return {
						itemId: number(item.itemId),
						quantity: number(item.quantity),
						name: item.name
					};
				})
			};
		})
	};
}

//#endregion
export { getBackendWeeklyRebate, parseBackendWeeklyRebate };