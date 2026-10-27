import { formatGameDate } from "../../utils/gameTime.js";
import { displayCurrencyText } from "../../constants/currency.js";
import { parseDailyCheckIn, parseNewcomerCheckIn } from "./daily-checkin.js";
import { parseCelestialCheckIn } from "./celestial-checkin.js";

//#region src/api/bot/signin-robot-query.ts
function presentDailyCheckIn(result) {
	const rewards = result.issued.map((reward) => `${displayCurrencyText(reward.name)} ×${reward.amount}`).join("、");
	const rewardText = result.dateIssued !== void 0 && result.accumulatedIssued !== void 0 ? `\n今日奖励：${result.dateIssued.map((r) => `${displayCurrencyText(r.name)} ×${r.amount}`).join("、") || "暂无配置奖励"}${result.accumulatedIssued.length ? `\n🎁 累计奖励已到账：${result.accumulatedIssued.map((r) => `${displayCurrencyText(r.name)} ×${r.amount}`).join("、")}` : ""}` : rewards ? `\n🎁 签到奖励：${rewards}` : "\n今日暂无配置奖励。";
	return {
		code: "OK",
		data: {
			ritualText: result.ritualText,
			message: `日常签到成功！\n本月累计签到：${result.accumulatedDays}天${rewardText}${result.progressText ? `\n${result.progressText}` : ""}${result.titleMessage ? `\n${result.titleMessage}` : ""}`
		}
	};
}
function parseRobotDailyCheckIn(value) {
	const result = presentDailyCheckIn(parseDailyCheckIn(value));
	if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.repeatSuffix !== "string") throw new Error("签到响应不完整");
	const suffix = value.repeatSuffix;
	if (suffix) result.data.message += "\n\n" + suffix;
	return result;
}
function presentNewcomerCheckIn(result) {
	const rewards = result.issued.map((reward) => `${displayCurrencyText(reward.name)} ×${reward.amount}`).join("、");
	return {
		code: "OK",
		data: {
			ritualText: result.ritualText,
			message: `新人签到成功！\n累计签到：${result.accumulatedDays}天\n活动截止：${formatGameDate(result.expireDate)}${rewards ? `\n🎁 签到奖励：${rewards}` : ""}`
		}
	};
}
function parseRobotNewcomerCheckIn(value) {
	const result = presentNewcomerCheckIn(parseNewcomerCheckIn(value));
	if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.repeatSuffix !== "string") throw new Error("签到响应不完整");
	const suffix = value.repeatSuffix;
	if (suffix) result.data.message += "\n\n" + suffix;
	return result;
}
function presentCelestialCheckIn(data) {
	const rewards = data.issued.map((item) => `${displayCurrencyText(item.name)} ×${item.amount}`).join("\n");
	return {
		code: "OK",
		data: {
			ritualText: data.ritualText,
			message: `登仙台签到成功！\n签到时段：${data.signedSlots.join("、")}\n🎁 签到奖励：\n${rewards}`
		}
	};
}
function parseRobotCelestialCheckIn(value) {
	const result = presentCelestialCheckIn(parseCelestialCheckIn(value));
	if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.repeatSuffix !== "string") throw new Error("签到响应不完整");
	const suffix = value.repeatSuffix;
	if (suffix) result.data.message += "\n\n" + suffix;
	return result;
}

//#endregion
export { parseRobotCelestialCheckIn, parseRobotDailyCheckIn, parseRobotNewcomerCheckIn, presentCelestialCheckIn, presentDailyCheckIn, presentNewcomerCheckIn };