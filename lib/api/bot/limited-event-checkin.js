import { requestBackend, writeContext } from "./client.js";
import { parsePositiveIssuedRewards } from "../schemas/issued-reward.js";

//#region src/api/bot/limited-event-checkin.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("活动签到响应不完整");
	return value;
}
function positiveInteger(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new Error("活动签到响应不完整");
	return value;
}
function issuedRewards(value) {
	return parsePositiveIssuedRewards(value, "活动签到响应不完整", "活动签到奖励响应不完整");
}
async function postBackendLimitedEventCheckin(bid, uid, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("活动签到参数无效");
	return parseLimitedEventCheckin(record(await requestBackend(bid, "post_players_id_limited_events_check_in", {
		path: { id: uid },
		...writeContext(request)
	})));
}
function parseLimitedEventCheckin(value) {
	const result = record(value);
	if (!Array.isArray(result.results)) throw new Error("活动签到响应不完整");
	return { results: result.results.map((value) => {
		const row = record(value);
		if (typeof row.eventTitle !== "string" || typeof row.subTitle !== "string") throw new Error("活动签到响应不完整");
		return {
			eventTitle: row.eventTitle,
			subTitle: row.subTitle,
			dayIndex: positiveInteger(row.dayIndex),
			issued: issuedRewards(row.issued)
		};
	}) };
}

//#endregion
export { parseLimitedEventCheckin, postBackendLimitedEventCheckin };