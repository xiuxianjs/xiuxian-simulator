import { displayCurrencyText } from "../../constants/currency.js";
import { parseBackendReferralBind, parseBackendReferralClaim } from "./referral-actions.js";

//#region src/api/bot/referral-actions-robot-query.ts
function referralBindArguments(text) {
	const match = text.trim().match(/绑定邀请码\s+(.+)/);
	return { code: match ? match[1].trim() : null };
}
function result(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("邀请码操作响应不完整");
	return value;
}
function parseRobotReferralBind(value) {
	const row = result(value);
	if (row.outcome === "usage") return { code: "NO_CODE" };
	if (row.outcome !== "result" || typeof row.message !== "string") throw new Error("绑定邀请码响应不完整");
	parseBackendReferralBind(row.data);
	return {
		code: "SUCCESS",
		displayMsg: row.message,
		showBar: true
	};
}
function parseRobotReferralClaim(value) {
	const row = result(value);
	if (row.outcome !== "result" || typeof row.message !== "string") throw new Error("领取邀请码奖励响应不完整");
	const data = parseBackendReferralClaim(row.data);
	return {
		displayMsg: row.message,
		rewards: data.issued.map((item) => `${displayCurrencyText(item.name)} ×${item.amount}`)
	};
}

//#endregion
export { parseRobotReferralBind, parseRobotReferralClaim, referralBindArguments };