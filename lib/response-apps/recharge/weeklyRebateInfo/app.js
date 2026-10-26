import { getBackendWeeklyRebate } from "../../../api/bot/weekly-rebate-queries.js";

//#region src/response-apps/recharge/weeklyRebateInfo/app.ts
const getWeeklyRebateInfoData = async (uid, bid) => {
	const status = await getBackendWeeklyRebate(bid, uid);
	if (!status.eligible) return {
		code: "NOT_ELIGIBLE",
		daysSinceRegistration: status.daysSinceRegistration,
		minAccountDays: status.minAccountDays
	};
	const dayRewards = status.rewards.map((reward) => ({
		day: reward.day,
		label: reward.label,
		rewardText: reward.rewardText,
		canClaim: reward.canClaim,
		statusTag: reward.statusTag
	}));
	return {
		code: "OK",
		todayLabel: status.todayLabel,
		todayRechargeText: status.todayRechargeText,
		thresholdYuan: status.thresholdYuan,
		dayRewards
	};
};

//#endregion
export { getWeeklyRebateInfoData };