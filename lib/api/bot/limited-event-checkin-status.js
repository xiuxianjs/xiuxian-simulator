import { requestBackend } from "./client.js";

//#region src/api/bot/limited-event-checkin-status.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const timestamp = (value) => typeof value === "string" && Number.isFinite(new Date(value).getTime());
function parseBackendLimitedEventCheckinStatus(data) {
	if (!Array.isArray(data)) throw new Error("限时活动签到状态列表不完整");
	return data.map((value) => {
		if (!record(value) || typeof value.eventTitle !== "string" || typeof value.subTitle !== "string" || !integer(value.subActivityId) || value.subActivityId <= 0 || !integer(value.totalDays) || value.totalDays < 0 || !timestamp(value.startTime) || typeof value.canClaimToday !== "boolean" || !Array.isArray(value.signedDays) || !value.signedDays.every((day) => integer(day) && day > 0) || !Array.isArray(value.rewards)) throw new Error("限时活动签到状态字段不完整");
		const signedDays = value.signedDays;
		const rewards = value.rewards.map((reward) => {
			if (!record(reward) || !integer(reward.dayIndex) || reward.dayIndex <= 0 || typeof reward.rewardName !== "string" || typeof reward.signed !== "boolean") throw new Error("限时活动签到奖励字段不完整");
			if (reward.signed !== signedDays.includes(reward.dayIndex)) throw new Error("限时活动签到奖励状态不一致");
			return {
				dayIndex: reward.dayIndex,
				rewardName: reward.rewardName,
				signed: reward.signed
			};
		});
		return {
			eventTitle: value.eventTitle,
			subTitle: value.subTitle,
			subActivityId: value.subActivityId,
			totalDays: value.totalDays,
			signedDays,
			startTime: value.startTime,
			canClaimToday: value.canClaimToday,
			rewards
		};
	});
}
async function getBackendLimitedEventCheckinStatus(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendLimitedEventCheckinStatus(await requestBackend(bid, "get_players_id_limited_events_check_ins", { path: { id: uid } }));
}

//#endregion
export { getBackendLimitedEventCheckinStatus, parseBackendLimitedEventCheckinStatus };