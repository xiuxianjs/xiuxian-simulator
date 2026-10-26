import { displayCurrencyText } from "../../../constants/currency.js";
import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendRobotIdentity } from "../../../api/bot/identity.js";
import { claimBackendActivityReward } from "../../../api/bot/activity-points-claim.js";
import { logger } from "alemonjs";

//#region src/response-apps/activityPoints/claim/app.ts
function failureCode(error) {
	if (error.code === "IDEMPOTENCY_IN_PROGRESS") return "BUSY";
	if (error.code === "ACTIVITY_ALREADY_CLAIMED") return "ALREADY_CLAIMED";
	if (error.code === "ACTIVITY_INSUFFICIENT_POINTS") return "INSUFFICIENT_POINTS";
	if (error.code === "ACTIVITY_REWARD_NOT_FOUND") return "REWARD_NOT_FOUND";
	if (error.code === "NOT_FOUND") return "USER_NOT_FOUND";
	return "CLAIM_FAILED";
}
async function App(params) {
	if (!params.bid?.trim()) return { code: "INVALID_USER" };
	if (!Number.isInteger(params.requiredPoints) || params.requiredPoints <= 0) return { code: "INVALID_REQUIRED_POINTS" };
	try {
		const uid = (await getBackendRobotIdentity(params.bid, params.request)).account.playerId;
		if (!uid || uid <= 0) return { code: "INVALID_USER" };
		const result = await claimBackendActivityReward(params.bid, uid, params.type, params.requiredPoints, params.request);
		return {
			code: "OK",
			data: {
				userName: result.userName,
				requiredPoints: result.requiredPoints,
				rewards: result.issued.map((reward) => ({
					name: displayCurrencyText(reward.name),
					amount: reward.amount
				}))
			}
		};
	} catch (error) {
		if (error instanceof BackendAPIError) return { code: failureCode(error) };
		logger.error(`领取${params.type === "daily" ? "日常" : "周常"}活跃奖励失败:`, error);
		return { code: "CLAIM_FAILED" };
	}
}

//#endregion
export { App as default };