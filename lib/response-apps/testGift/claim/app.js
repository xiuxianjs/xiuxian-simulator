import { redeemBackendExternalGiftCode } from "../../../api/bot/gift-code-redeem.js";

//#region src/response-apps/testGift/claim/app.ts
async function App(params) {
	if (!params.code) return { code: "INVALID_CODE" };
	try {
		return {
			code: "OK",
			data: await redeemBackendExternalGiftCode(params.bid, params.uid, params.code, "test", params.request)
		};
	} catch (error) {
		return {
			code: "CLAIM_FAILED",
			data: { message: error instanceof Error ? error.message : "领取测试礼包失败" }
		};
	}
}

//#endregion
export { App as default };