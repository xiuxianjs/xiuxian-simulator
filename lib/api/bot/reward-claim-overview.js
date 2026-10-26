import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parsePositiveIssuedRewards } from "../schemas/issued-reward.js";
import { parseBackendMonthCardDailyRewards, parseMonthCardClaimResult } from "./month-card-daily-rewards.js";

//#region src/api/bot/reward-claim-overview.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
async function claimBackendMonthCardOverview(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendMonthCardOverview(await requestBackend(bid, "post_players_id_recharge_month_card_daily_rewards_claim_overview", {
		path: { id: uid },
		headers: repeatPresentationHeaders("月卡领取"),
		...writeContext(request)
	}));
}
function parseBackendMonthCardOverview(data) {
	if (!record(data) || typeof data.beforeTotal !== "number" || !Number.isSafeInteger(data.beforeTotal) || data.beforeTotal < 0 || data.statusError !== void 0 && typeof data.statusError !== "string") throw new Error("月卡每日奖励响应不完整");
	return {
		beforeTotal: data.beforeTotal,
		claim: data.claim === null ? null : parseMonthCardClaimResult(data.claim),
		status: data.status === null ? null : parseBackendMonthCardDailyRewards(data.status),
		statusError: data.statusError
	};
}
async function claimBackendFirstRechargeOverview(bid, uid, tierAmount, request) {
	return parseBackendFirstRechargeOverview(await requestBackend(bid, "post_players_id_recharge_first_tiers_tierAmount_claim_overview", {
		path: {
			id: uid,
			tierAmount
		},
		headers: repeatPresentationHeaders("领取礼包奖励"),
		...writeContext(request)
	}));
}
function parseBackendFirstRechargeOverview(data) {
	if (!record(data) || !Array.isArray(data.validTiers) || !data.validTiers.every(Number.isFinite) || typeof data.validTier !== "boolean" || data.claimError !== void 0 && typeof data.claimError !== "string") throw new Error("首充领取响应不完整");
	const row = data;
	if (row.result !== null) {
		if (!record(row.result)) throw new Error("首充领取响应不完整");
		const issued = parsePositiveIssuedRewards(row.result.issued === null ? [] : row.result.issued, "首充领取响应不完整");
		return {
			...row,
			result: {
				...row.result,
				issued
			}
		};
	}
	return {
		...row,
		result: null
	};
}

//#endregion
export { claimBackendFirstRechargeOverview, claimBackendMonthCardOverview, parseBackendFirstRechargeOverview, parseBackendMonthCardOverview };