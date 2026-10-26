import { getBackendReferralOverview } from "../../../api/bot/referral-overview.js";
import { logger } from "alemonjs";

//#region src/response-apps/referral/viewCode/app.ts
/**
* 查看邀请码 - 数据层
*/
async function getViewCodeData(bid, uid, request) {
	try {
		const overview = await getBackendReferralOverview(bid, uid, request);
		return {
			code: "OK",
			referralCode: overview.code,
			inviteCount: overview.inviteCount,
			inviteLimit: overview.inviteLimit,
			pendingRewards: overview.pendingRewards
		};
	} catch (error) {
		logger.error("查看邀请码失败:", error);
		return { code: "FAILED" };
	}
}

//#endregion
export { getViewCodeData };