import { getBackendNewcomerRechargeInfo } from "../../../api/bot/newcomer-recharge-queries.js";

//#region src/response-apps/recharge/newcomerInfo/app.ts
const getNewcomerInfoData = async (uid, bid) => {
	const data = await getBackendNewcomerRechargeInfo(bid, uid);
	if (!data.isInPeriod) return { code: "NOT_IN_PERIOD" };
	const { todayRechargedAmount, currentDay, rewards, thresholdAmount } = data;
	const dayRewards = rewards.map((reward) => ({
		day: reward.day,
		rewardText: reward.rewardText,
		canClaim: reward.canClaim,
		statusTag: reward.statusTag
	}));
	return {
		code: "OK",
		currentDay,
		contentDays: data.contentDays,
		todayRechargedYuan: todayRechargedAmount / 100,
		thresholdYuan: thresholdAmount / 100,
		dayRewards
	};
};

//#endregion
export { getNewcomerInfoData };