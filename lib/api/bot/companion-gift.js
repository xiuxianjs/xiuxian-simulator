import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/companion-gift.ts
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
async function giveBackendCompanionGift(bid, uid, targetUserId, giftName, request) {
	if (!bid) throw new Error("赠礼请求缺少平台身份");
	return parseCompanionGiftSettlement(await requestBackend(bid, "post_players_id_companion_gifts", {
		path: { id: uid },
		body: {
			targetUserId,
			giftName
		},
		...writeContext(request)
	}));
}
function parseCompanionGiftSettlement(data) {
	if (!record(data) || typeof data.success !== "boolean" || typeof data.message !== "string" || typeof data.giftName !== "string" || typeof data.targetName !== "string" || typeof data.reply !== "string" || !integer(data.intimacyGained) || !integer(data.tongxinGained) || typeof data.premium !== "boolean") throw new Error("赠礼结算响应不完整");
	return {
		success: data.success,
		message: data.message,
		giftName: data.giftName,
		targetName: data.targetName,
		reply: data.reply,
		intimacyGained: data.intimacyGained,
		tongxinGained: data.tongxinGained,
		premium: data.premium
	};
}

//#endregion
export { giveBackendCompanionGift, parseCompanionGiftSettlement };