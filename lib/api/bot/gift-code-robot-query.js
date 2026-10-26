import { parseGiftCodeRedeemResult } from "./gift-code-redeem.js";
import { extractCode } from "../../response/redeemCode/claim/command.js";

//#region src/api/bot/gift-code-robot-query.ts
function giftCodeArguments(text) {
	return { code: extractCode(text).replace(/\s+/g, "").trim().toUpperCase() };
}
function parseRobotGiftCode(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("礼包码响应不完整");
	const row = value;
	if (row.outcome === "usage") return { code: "NO_CODE" };
	if (row.outcome !== "result" || ![
		"custom",
		"comeback",
		"test"
	].includes(String(row.kind))) throw new Error("礼包码响应不完整");
	const data = parseGiftCodeRedeemResult(row.data, row.kind === "custom" ? "礼包码兑换" : "远端礼包码兑换");
	const detail = row.data;
	if (detail.pendingConfirm !== void 0 && typeof detail.pendingConfirm !== "boolean") throw new Error("礼包码核销状态不完整");
	return {
		code: row.kind === "custom" ? "CUSTOM_SUCCESS" : row.kind === "comeback" ? "COMEBACK_SUCCESS" : "TEST_SUCCESS",
		displayMsg: data.message,
		rewardSummary: data.rewardSummary,
		pendingConfirm: row.kind !== "custom" && detail.pendingConfirm === true
	};
}
function parseRobotGiftHub(value) {
	if (!value || typeof value !== "object" || Array.isArray(value) || value.outcome !== "menu") throw new Error("兑换码入口响应不完整");
	return { outcome: "menu" };
}
function parseRobotOldGameCode(value) {
	if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.giftCode !== "string" || !value.giftCode.trim()) throw new Error("凡人修仙礼包码响应不完整");
	return { giftCode: value.giftCode };
}

//#endregion
export { giftCodeArguments, parseRobotGiftCode, parseRobotGiftHub, parseRobotOldGameCode };