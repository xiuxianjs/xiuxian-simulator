import { redeemBackendExternalGiftCode } from "../../../api/bot/gift-code-redeem.js";

//#region src/response-apps/comeback/claim/app.ts
function extractComebackCode(messageText) {
	return messageText.replace(/^(!|！|\/|#|＃)?领取回归礼包/, "").trim();
}
async function App(params) {
	const { uid, bid, messageText } = params;
	const code = extractComebackCode(messageText);
	if (!code) return {
		code: "NO_CODE",
		data: { message: "请输入礼包码，例如：/领取回归礼包 ABCD1234" }
	};
	try {
		return {
			code: "OK",
			data: await redeemBackendExternalGiftCode(bid, uid, code, "comeback", params.request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "领取回归礼包失败" }
		};
	}
}

//#endregion
export { App as default };