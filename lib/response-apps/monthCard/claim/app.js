import { BackendAPIError } from "../../../api/bot/client.js";
import { claimBackendMonthCardOverview } from "../../../api/bot/reward-claim-overview.js";
import { logger } from "alemonjs";

//#region src/response-apps/monthCard/claim/app.ts
async function App(params) {
	const { bid, uid, request } = params;
	try {
		const overview = await claimBackendMonthCardOverview(bid, uid, request);
		if (overview.beforeTotal === 0) return { code: "NO_MONTH_CARD" };
		const result = overview.claim;
		const status = overview.status;
		if (!result || !status) return { code: "CLAIM_FAILED" };
		return {
			code: "OK",
			data: {
				days: result.days,
				rewards: {
					spiritCrystal: result.rewards.spiritCrystal,
					huanHunDan: result.rewards.mentalPill,
					yangShenDan: result.rewards.qiPill
				},
				status: {
					claimedCount: status.claimedCount,
					upcomingCount: status.upcomingCount
				}
			}
		};
	} catch (error) {
		if (error instanceof BackendAPIError && error.status === 409) {
			if (error.code === "MONTH_CARD_NOT_ACTIVE") return { code: "NO_MONTH_CARD" };
			if (error.code === "MONTH_CARD_NO_CLAIMABLE_REWARDS") return { code: "NO_REWARDS" };
		}
		logger.error("月卡一键领取失败:", error);
		return { code: "CLAIM_FAILED" };
	}
}

//#endregion
export { App as default };