import { requestBackend, writeContext } from "./client.js";
import { parsePositiveIssuedRewards } from "../schemas/issued-reward.js";

//#region src/api/bot/weekly-rebate-claim.ts
function row(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("周周返利领取响应不完整");
	return value;
}
async function claimBackendWeeklyRebate(bid, uid, dayIndex, request) {
	if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1 || !Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > 8) throw new Error("周周返利领取参数无效");
	return parseBackendWeeklyRebateIssued(row(await requestBackend(bid, "post_players_id_recharge_weekly_rebate_dayIndex_claim", {
		path: {
			id: uid,
			dayIndex
		},
		...writeContext(request)
	})));
}
function parseBackendWeeklyRebateIssued(value) {
	return parsePositiveIssuedRewards(row(value).issued, "周周返利领取响应不完整");
}
function parseRobotWeeklyRebateClaim(value) {
	const data = row(value);
	if (!Number.isSafeInteger(data.dayIndex) || Number(data.dayIndex) < 1 || Number(data.dayIndex) > 8) throw new Error("周周返利领取响应不完整");
	return {
		dayIndex: data.dayIndex,
		issued: parseBackendWeeklyRebateIssued(data)
	};
}

//#endregion
export { claimBackendWeeklyRebate, parseBackendWeeklyRebateIssued, parseRobotWeeklyRebateClaim };