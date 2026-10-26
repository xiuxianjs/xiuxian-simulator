import { BackendAPIError } from "../../../api/bot/client.js";
import "../../../api/index.js";
import { giveBackendCompanionGift } from "../../../api/bot/companion-gift.js";

//#region src/response-apps/companion/gift/app.ts
/** The robot only forwards parsed command input and renders the server settlement. */
async function performGift(params) {
	try {
		const result = await giveBackendCompanionGift(params.bid, params.uid, params.targetUid, params.giftName, params.request);
		return {
			code: "GIFT_OK",
			data: {
				message: result.message,
				tongxinGained: result.tongxinGained,
				reply: result.reply
			}
		};
	} catch (error) {
		if (error instanceof BackendAPIError) return {
			code: "GIFT_FAIL",
			data: { message: error.message }
		};
		return {
			code: "GIFT_FAIL",
			data: { message: "赠送失败，请稍后再试" }
		};
	}
}

//#endregion
export { performGift };