import { BackendAPIError } from "../../../api/bot/client.js";
import { isBackendNotFound, redeemBackendExternalGiftCode, redeemBackendGiftCode } from "../../../api/bot/gift-code-redeem.js";
import { extractCode } from "../../../response/redeemCode/claim/command.js";

//#region src/response-apps/redeemCode/claim/app.ts
/** 礼包码兑换：机器人只解析输入、调用 Go 并展示服务端结果。 */
async function getClaimData(uid, bid, messageText, request) {
	const rawCode = extractCode(messageText ?? "");
	if (!rawCode) return { code: "NO_CODE" };
	try {
		const redeemed = await redeemBackendGiftCode(bid, uid, rawCode, request);
		return {
			code: "CUSTOM_SUCCESS",
			displayMsg: redeemed.message,
			rewardSummary: redeemed.rewardSummary
		};
	} catch (error) {
		if (!isBackendNotFound(error)) return {
			code: "FAILED",
			displayMsg: error instanceof BackendAPIError ? error.message : "礼包码兑换失败，请稍后再试"
		};
	}
	let comebackError;
	try {
		const redeemed = await redeemBackendExternalGiftCode(bid, uid, rawCode, "comeback", request);
		return {
			code: "COMEBACK_SUCCESS",
			displayMsg: redeemed.message,
			rewardSummary: redeemed.rewardSummary
		};
	} catch (error) {
		comebackError = error;
	}
	try {
		const redeemed = await redeemBackendExternalGiftCode(bid, uid, rawCode, "test", request);
		return {
			code: "TEST_SUCCESS",
			displayMsg: redeemed.message,
			rewardSummary: redeemed.rewardSummary
		};
	} catch (error) {
		const preferred = error instanceof BackendAPIError ? error : comebackError;
		return {
			code: "FAILED",
			displayMsg: preferred instanceof BackendAPIError ? preferred.message : "礼包码无效或已使用"
		};
	}
}

//#endregion
export { getClaimData };