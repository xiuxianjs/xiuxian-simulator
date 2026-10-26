import { BackendAPIError } from "../../../api/bot/client.js";
import { claimBackendNewcomerRechargeDay } from "../../../api/bot/newcomer-recharge-claim.js";

//#region src/response-apps/recharge/newcomerClaim/app.ts
const getNewcomerClaimData = async (bid, uid, messageText, request) => {
	const match = messageText.trim().match(/新人返利领取\s+(\d+)/);
	if (!match) return { code: "NO_MATCH" };
	const dayIndex = parseInt(match[1], 10);
	if (isNaN(dayIndex) || dayIndex < 1 || dayIndex > 14) return {
		code: "INVALID_DAY",
		maxDays: 14
	};
	try {
		const result = await claimBackendNewcomerRechargeDay(bid, uid, dayIndex, request, messageText);
		return {
			code: "SUCCESS",
			dayIndex: result.dayIndex,
			rewardText: result.rewardText
		};
	} catch (error) {
		if (error instanceof BackendAPIError) switch (error.message) {
			case "您已过新人期，无法领取新人狂欢奖励。": return { code: "NOT_IN_PERIOD" };
			case "奖励尚未解锁": return {
				code: "NOT_UNLOCKED",
				dayIndex
			};
			case "今日充值不足": return { code: "INSUFFICIENT_RECHARGE" };
			default: return {
				code: "FAILED",
				error: error.message
			};
		}
		throw error;
	}
};

//#endregion
export { getNewcomerClaimData };