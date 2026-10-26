import { displayCurrencyText } from "../../../constants/currency.js";
import { claimBackendWeeklyRebate } from "../../../api/bot/weekly-rebate-claim.js";

//#region src/response-apps/recharge/weeklyRebateClaim/app.ts
const DAY_LABELS = [
	"",
	"周一",
	"周二",
	"周三",
	"周四",
	"周五",
	"周六",
	"周日",
	"满勤大奖"
];
const getWeeklyRebateClaimData = async (uid, bid, messageText, request) => {
	const match = messageText.trim().match(/周周返利领取\s+(\d+)/);
	if (!match) return { code: "NO_MATCH" };
	const dayIndex = Number.parseInt(match[1], 10);
	if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > 8) return { code: "INVALID_DAY" };
	try {
		const issued = await claimBackendWeeklyRebate(bid, uid, dayIndex, request);
		return {
			code: "SUCCESS",
			label: DAY_LABELS[dayIndex] ?? `第${dayIndex}天`,
			rewardText: issued.length ? issued.map((reward) => `${displayCurrencyText(reward.name)}x${reward.amount}`).join("、") : "无"
		};
	} catch (error) {
		return {
			code: "FAILED",
			error: error instanceof Error ? error.message : "领取失败"
		};
	}
};

//#endregion
export { getWeeklyRebateClaimData };