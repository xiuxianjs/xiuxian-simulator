import { displayCurrencyText } from "../../constants/currency.js";

//#region src/api/bot/native-comeback.ts
function isOverview(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const overview = value;
	if (typeof overview.enabled !== "boolean" || !overview.rules || typeof overview.rules !== "object") return false;
	const rules = overview.rules;
	if (typeof rules.smallSilentDays !== "number" || typeof rules.largeSilentDays !== "number" || typeof rules.expireDays !== "number") return false;
	if (overview.current === null) return true;
	if (!overview.current || typeof overview.current !== "object") return false;
	const current = overview.current;
	if (typeof current.comebackTypeText !== "string" || typeof current.remainingText !== "string" || typeof current.silentDays !== "number" || typeof current.expBonusPercent !== "number") return false;
	if (!current.signIn || typeof current.signIn !== "object") return false;
	const signIn = current.signIn;
	return typeof signIn.currentDayIndex === "number" && typeof signIn.canClaimToday === "boolean" && Array.isArray(signIn.days) && signIn.days.every((day) => day && typeof day === "object" && typeof day.dayIndex === "number" && typeof day.statusText === "string" && typeof day.rewardsPreviewText === "string");
}
function parseNativeComebackOverview(value) {
	if (!isOverview(value)) throw new Error("本服回归响应不完整");
	const data = value;
	return {
		...data,
		current: data.current ? {
			...data.current,
			signIn: {
				...data.current.signIn,
				days: data.current.signIn.days.map((day) => ({
					...day,
					rewardsPreviewText: displayCurrencyText(day.rewardsPreviewText)
				}))
			}
		} : null
	};
}
function parseNativeComebackClaim(value) {
	if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.message !== "string") throw new Error("回归签到响应不完整");
	const payload = value;
	return {
		message: payload.message,
		rewardSummary: Array.isArray(payload.rewardSummary) ? payload.rewardSummary.filter((item) => typeof item === "string") : []
	};
}

//#endregion
export { parseNativeComebackClaim, parseNativeComebackOverview };