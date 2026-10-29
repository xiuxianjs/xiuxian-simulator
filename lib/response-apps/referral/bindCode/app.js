import { displayCurrencyText } from "../../../constants/currency.js";
import { bindBackendReferralCode, referralBindFailureMessage } from "../../../api/bot/referral-actions.js";
import { withBackendRepeatDetection } from "../../../utils/backendRepeatDetector.js";
import { logger } from "alemonjs";

//#region src/response-apps/referral/bindCode/app.ts
/**
* 绑定邀请码 - 数据层
*/
async function getBindCodeData(bid, uid, messageText, request) {
	const match = (messageText?.trim() ?? "").match(/绑定邀请码\s+(.+)/);
	if (!match) return { code: "NO_CODE" };
	const referralCode = match[1].trim();
	try {
		const rewards = await bindBackendReferralCode(bid, uid, referralCode, request);
		const rewardText = rewards.length > 0 ? `\n获得奖励：${rewards.map((item) => `${displayCurrencyText(item.name)} ×${item.amount}`).join("、")}` : "";
		return {
			code: "SUCCESS",
			displayMsg: await withBackendRepeatDetection(bid, uid, "绑定邀请码", `成功绑定邀请码！${rewardText}`, request),
			showBar: true
		};
	} catch (error) {
		const businessMessage = referralBindFailureMessage(error);
		if (businessMessage) return {
			code: "SUCCESS",
			displayMsg: await withBackendRepeatDetection(bid, uid, "绑定邀请码", businessMessage, request),
			showBar: false
		};
		logger.error("绑定邀请码失败:", error);
		return {
			code: "FAILED",
			displayMsg: await withBackendRepeatDetection(bid, uid, "绑定邀请码", "绑定失败，请稍后再试", request)
		};
	}
}

//#endregion
export { getBindCodeData };