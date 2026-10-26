import { getBackendReferralOverview } from "../../../../api/bot/referral-overview.js";
import { logger } from "alemonjs";

//#region src/response-apps/referral/rewardRules/vip/app.ts
/**
* VIP等级奖励 - 数据层
*/
async function getVipRulesData(bid, uid, request) {
	try {
		const overview = await getBackendReferralOverview(bid, uid, request);
		const panel = overview.rulePanels.vip_level;
		return {
			code: "OK",
			inviteCount: overview.inviteCount,
			pendingCount: panel.pendingCount,
			groups: panel.groups
		};
	} catch (error) {
		logger.error("查看VIP等级奖励失败:", error);
		return { code: "FAILED" };
	}
}

//#endregion
export { getVipRulesData };