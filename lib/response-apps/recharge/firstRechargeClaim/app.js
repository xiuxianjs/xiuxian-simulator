import { displayCurrencyText } from "../../../constants/currency.js";
import { claimBackendFirstRechargeOverview } from "../../../api/bot/reward-claim-overview.js";

//#region src/response-apps/recharge/firstRechargeClaim/app.ts
const getFirstRechargeClaimData = async (uid, bid, messageText, request) => {
	const match = messageText.trim().match(/领取礼包奖励\s+(\d+)/);
	if (!match) return { code: "NO_MATCH" };
	const tierYuan = Number.parseInt(match[1], 10);
	const overview = await claimBackendFirstRechargeOverview(bid, uid, tierYuan * 100, request);
	const validTiers = overview.validTiers;
	if (!validTiers.includes(tierYuan)) return {
		code: "INVALID_TIER",
		validTiers
	};
	try {
		if (overview.claimError) return {
			code: "FAILED",
			error: overview.claimError
		};
		const issued = overview.result?.issued;
		if (!issued) throw new Error("首充领取响应不完整");
		return {
			code: "SUCCESS",
			tierYuan,
			rewardText: issued.length ? issued.map((reward) => `${displayCurrencyText(reward.name)}x${reward.amount}`).join("、") : "无"
		};
	} catch (error) {
		return {
			code: "FAILED",
			error: error instanceof Error ? error.message : "领取失败"
		};
	}
};

//#endregion
export { getFirstRechargeClaimData };