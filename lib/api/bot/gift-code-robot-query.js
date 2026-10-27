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
	if (row.outcome !== "result" || row.kind !== "custom") throw new Error("礼包码响应不完整");
	const data = parseGiftCodeRedeemResult(row.data, "礼包码兑换");
	return {
		code: "CUSTOM_SUCCESS",
		displayMsg: data.message,
		rewardSummary: data.rewardSummary
	};
}
function parseRobotGiftHub(value) {
	if (!value || typeof value !== "object" || Array.isArray(value) || value.outcome !== "menu") throw new Error("兑换码入口响应不完整");
	return { outcome: "menu" };
}

//#endregion
export { giftCodeArguments, parseRobotGiftCode, parseRobotGiftHub };