import { displayCurrencyText } from "../../../constants/currency.js";
import { claimBackendReferralRewards, referralClaimFailureMessage } from "../../../api/bot/referral-actions.js";
import { withBackendRepeatDetection } from "../../../utils/backendRepeatDetector.js";
import { logger } from "alemonjs";

//#region src/response-apps/referral/claimReward/app.ts
/**
* 领取邀请奖励 - 数据层
*/
async function getClaimRewardData(bid, uid, request) {
	try {
		const result = await claimBackendReferralRewards(bid, uid, request);
		const rewards = result.issued.map((item) => `${displayCurrencyText(item.name)} ×${item.amount}`);
		return {
			code: "OK",
			displayMsg: await withBackendRepeatDetection(bid, uid, "领取邀请奖励", `成功领取 ${result.claimed} 条邀请奖励`, request),
			rewards
		};
	} catch (error) {
		const businessMessage = referralClaimFailureMessage(error);
		if (businessMessage) return {
			code: "OK",
			displayMsg: await withBackendRepeatDetection(bid, uid, "领取邀请奖励", businessMessage, request),
			rewards: []
		};
		logger.error("领取邀请奖励失败:", error);
		return {
			code: "FAILED",
			displayMsg: await withBackendRepeatDetection(bid, uid, "领取邀请奖励", "领取失败，请稍后再试", request)
		};
	}
}

//#endregion
export { getClaimRewardData };