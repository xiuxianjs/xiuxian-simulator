import { requestBackend, writeContext } from "./client.js";
import { parsePositiveIssuedRewards } from "../schemas/issued-reward.js";
import { WEEKLY_CUMULATIVE_MODE, WEEKLY_CUMULATIVE_RULES, WEEKLY_CUMULATIVE_THRESHOLDS } from "../schemas/weekly-rebate-query.js";
import { weeklyRebateWeekStart } from "./weekly-rebate-queries.js";

//#region src/api/bot/weekly-rebate-claim.ts
function row(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("周周返利领取响应不完整");
	return value;
}
async function claimBackendWeeklyRebate(bid, uid, dayIndex, request, expectedWeekStart) {
	const cumulative = WEEKLY_CUMULATIVE_THRESHOLDS.some((tier) => tier === dayIndex);
	if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1 || !Number.isInteger(dayIndex) || !cumulative && (dayIndex < 1 || dayIndex > 8)) throw new Error("周周返利领取参数无效");
	const body = cumulative ? { expectedWeekStart: weeklyRebateWeekStart(expectedWeekStart) } : void 0;
	return parseBackendWeeklyRebateIssued(row(await requestBackend(bid, "post_players_id_recharge_weekly_rebate_dayIndex_claim", {
		path: {
			id: uid,
			dayIndex
		},
		...body ? { body } : {},
		...writeContext(request)
	})));
}
function parseBackendWeeklyRebateIssued(value) {
	return parsePositiveIssuedRewards(row(value).issued, "周周返利领取响应不完整");
}
async function claimBackendWeeklyRebateLoop(bid, uid, expectedWeekStart, expectedLoopCount, request) {
	if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1 || !Number.isSafeInteger(expectedLoopCount) || expectedLoopCount < 1) throw new Error("周周返利循环领取参数无效");
	return parseRobotWeeklyRebateClaim(await requestBackend(bid, "post_players_id_recharge_weekly_rebate_loop_claim", {
		path: { id: uid },
		body: {
			expectedWeekStart: weeklyRebateWeekStart(expectedWeekStart),
			expectedLoopCount
		},
		...writeContext(request)
	}));
}
function parseRobotWeeklyRebateClaim(value) {
	const data = row(value);
	if (data.mode === "weekly_cumulative") {
		if (data.rulesVersion !== "weekly-rebate-v2-cumulative-20261030" || typeof data.label !== "string" || !data.label.trim()) throw new Error("周周返利领取响应不完整");
		if (data.delivery !== void 0 && data.delivery !== "inventory" && data.delivery !== "mail") throw new Error("周周返利发放方式响应不完整");
		const common = {
			mode: WEEKLY_CUMULATIVE_MODE,
			rulesVersion: WEEKLY_CUMULATIVE_RULES,
			weekStart: weeklyRebateWeekStart(data.weekStart),
			thresholdAmount: data.thresholdAmount,
			thresholdYuan: data.thresholdYuan,
			label: data.label,
			issued: parseBackendWeeklyRebateIssued(data)
		};
		if (data.delivery !== void 0) common.delivery = data.delivery;
		if (data.kind === "loop") {
			if (!Number.isSafeInteger(data.thresholdAmount) || Number(data.thresholdAmount) < 64800 || data.thresholdYuan !== Number(data.thresholdAmount) / 100 || !Number.isSafeInteger(data.fromCount) || Number(data.fromCount) < 0 || !Number.isSafeInteger(data.toCount) || Number(data.toCount) < 0 || !Number.isSafeInteger(data.claimedCount) || Number(data.claimedCount) < 0) throw new Error("周周返利循环领取响应不完整");
			return {
				...common,
				kind: "loop",
				fromCount: data.fromCount,
				toCount: data.toCount,
				claimedCount: data.claimedCount
			};
		}
		if (data.kind !== "tier" || !WEEKLY_CUMULATIVE_THRESHOLDS.some((tier) => tier === data.thresholdYuan) || data.thresholdAmount !== Number(data.thresholdYuan) * 100) throw new Error("周周返利领取档位响应不完整");
		return {
			...common,
			kind: "tier"
		};
	}
	if (data.mode !== void 0) throw new Error("周周返利领取模式尚未支持");
	if (!Number.isSafeInteger(data.dayIndex) || Number(data.dayIndex) < 1 || Number(data.dayIndex) > 8) throw new Error("周周返利领取响应不完整");
	return {
		dayIndex: data.dayIndex,
		issued: parseBackendWeeklyRebateIssued(data)
	};
}

//#endregion
export { claimBackendWeeklyRebate, claimBackendWeeklyRebateLoop, parseBackendWeeklyRebateIssued, parseRobotWeeklyRebateClaim };