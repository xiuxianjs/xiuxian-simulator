import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/gift-code-redeem.ts
function record(value, label) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}响应不完整`);
	return value;
}
function parseGiftCodeRedeemResult(value, label) {
	const row = record(value, label);
	if (typeof row.message !== "string") throw new Error(`${label}响应不完整`);
	const rewardSummary = row.rewardSummary;
	if (rewardSummary !== void 0 && (!Array.isArray(rewardSummary) || rewardSummary.some((item) => typeof item !== "string"))) throw new Error(`${label}奖励响应不完整`);
	return {
		message: row.message,
		rewardSummary: rewardSummary ?? []
	};
}
function input(bid, uid, code) {
	const platformID = bid?.trim();
	const normalized = code.replace(/\s+/g, "").trim().toUpperCase();
	if (!platformID || !Number.isSafeInteger(uid) || uid <= 0 || !normalized) throw new Error("礼包码参数无效");
	return {
		bid: platformID,
		code: normalized
	};
}
async function redeemBackendGiftCode(bid, uid, rawCode, request) {
	const { bid: platformID, code } = input(bid, uid, rawCode);
	const row = record(await requestBackend(platformID, "post_players_id_gift_codes_redeem", {
		path: { id: uid },
		body: { code },
		...writeContext(request)
	}), "礼包码兑换");
	if (row.message === void 0 && row.rewardSummary === void 0 && row.requestId === request?.requestId && typeof row.requestId === "string" && row.requestId.length > 0 && row.status === "SUCCEEDED" && typeof row.emailId === "number" && Number.isSafeInteger(row.emailId) && row.emailId > 0) return {
		message: "兑换成功，奖励已发送至邮件",
		rewardSummary: []
	};
	return parseGiftCodeRedeemResult(row, "礼包码兑换");
}

//#endregion
export { parseGiftCodeRedeemResult, redeemBackendGiftCode };