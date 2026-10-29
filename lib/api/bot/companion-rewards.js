import { parseDailyCheckIn } from "./daily-checkin.js";
import { parseMonthCardClaimResult } from "./month-card-daily-rewards.js";

//#region src/api/bot/companion-rewards.ts
function partner(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("道侣代领响应不完整");
	const row = value;
	if (typeof row.partnerId !== "number" || !Number.isSafeInteger(row.partnerId) || row.partnerId < 1 || typeof row.partnerName !== "string") throw new Error("道侣代领响应不完整");
	return row;
}
function parseCompanionDailyReward(value) {
	const row = partner(value);
	const daily = parseDailyCheckIn(row.dailyCheckIn);
	return [
		`已为道侣 ${row.partnerName}（UID ${row.partnerId}）完成日常签到`,
		`对方本月累计签到：${daily.accumulatedDays} 天`,
		...daily.issued.map((reward) => `${reward.name} ×${reward.amount}`),
		"奖励已发放至道侣账户"
	];
}
function parseCompanionMonthCardReward(value) {
	const row = partner(value);
	const claim = parseMonthCardClaimResult(row.monthCard);
	return [
		`已为道侣 ${row.partnerName}（UID ${row.partnerId}）领取 ${claim.days} 天月卡奖励`,
		`灵晶 ×${claim.rewards.spiritCrystal}`,
		`精力丹 ×${claim.rewards.mentalPill}`,
		`元力丹 ×${claim.rewards.qiPill}`,
		"奖励已发放至道侣账户"
	];
}

//#endregion
export { parseCompanionDailyReward, parseCompanionMonthCardReward };