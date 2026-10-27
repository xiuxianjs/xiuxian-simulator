import { displayCurrencyText } from "../../../constants/currency.js";
import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendRobotIdentity } from "../../../api/bot/identity.js";
import { claimAllBackendActivityRewards } from "../../../api/bot/activity-points-claim.js";
import { logger } from "alemonjs";

//#region src/response-apps/activityPoints/claimAll/app.ts
async function App(params) {
	if (!params.bid?.trim()) return { code: "INVALID_USER" };
	try {
		const uid = (await getBackendRobotIdentity(params.bid, params.request)).account.playerId;
		if (!uid || uid <= 0) return { code: "INVALID_USER" };
		const result = await claimAllBackendActivityRewards(params.bid, uid, params.type, params.request);
		const claimed = result.claimed.map((item) => ({
			requiredPoints: item.requiredPoints,
			rewards: item.issued.map((reward) => ({
				name: displayCurrencyText(reward.name),
				amount: reward.amount
			}))
		}));
		return {
			code: "OK",
			data: {
				userName: result.claimed[0]?.userName ?? result.userName ?? "",
				taskRewards: (result.taskRewards ?? []).map((reward) => ({
					name: displayCurrencyText(reward.name),
					amount: reward.amount
				})),
				partial: result.partial,
				claimed,
				...result.error ? { error: result.error } : {}
			}
		};
	} catch (error) {
		if (error instanceof BackendAPIError && error.code === "ACTIVITY_NOTHING_TO_CLAIM") return { code: "NOTHING_TO_CLAIM" };
		logger.error(`一键领取${params.type === "daily" ? "日常" : "周常"}活跃奖励失败:`, error);
		return { code: "CLAIM_FAILED" };
	}
}

//#endregion
export { App as default };