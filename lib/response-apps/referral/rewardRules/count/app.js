import { getBackendReferralOverview } from "../../../../api/bot/referral-overview.js";
import { logger } from "alemonjs";

//#region src/response-apps/referral/rewardRules/count/app.ts
/**
* 邀请人数奖励 - 数据层
*/
async function getCountRulesData(bid, uid, request) {
	try {
		const overview = await getBackendReferralOverview(bid, uid, request);
		const panel = overview.rulePanels.count;
		return {
			code: "OK",
			inviteCount: overview.inviteCount,
			pendingCount: panel.pendingCount,
			groups: panel.groups
		};
	} catch (error) {
		logger.error("查看邀请人数奖励失败:", error);
		return { code: "FAILED" };
	}
}

//#endregion
export { getCountRulesData };