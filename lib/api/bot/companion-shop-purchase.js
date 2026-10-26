import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/companion-shop-purchase.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const positiveInteger = (value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
async function previewBackendCompanionShopPurchase(bid, uid, productId, count, request) {
	if (!bid) throw new Error("兑换请求缺少平台身份");
	return parseBackendCompanionShopPreview(await requestBackend(bid, "post_players_id_companion_shop_purchases_preview", {
		path: { id: uid },
		body: {
			productId,
			count
		},
		requestId: request?.requestId
	}));
}
function parseBackendCompanionShopPreview(data) {
	if (!record(data) || !positiveInteger(data.productId) || typeof data.name !== "string" || ![data.unitPrice, data.totalPrice].every(integer) || !positiveInteger(data.grantQuantity) || !positiveInteger(data.count)) throw new Error("道侣商店预检响应不完整");
	return data;
}
async function purchaseBackendCompanionShop(bid, uid, productId, count, request) {
	if (!bid) throw new Error("兑换请求缺少平台身份");
	const data = await requestBackend(bid, "post_players_id_companion_shop_purchases", {
		path: { id: uid },
		body: {
			productId,
			count
		},
		...writeContext(request)
	});
	if (!record(data) || typeof data.name !== "string" || typeof data.paid !== "string" || ![data.granted, data.buyCount].every(integer)) throw new Error("道侣商店结算响应不完整");
	return data;
}

//#endregion
export { parseBackendCompanionShopPreview, previewBackendCompanionShopPurchase, purchaseBackendCompanionShop };