import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/checkin-shop-purchase.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("签到商店购买响应不完整");
	return value;
}
function nonNegativeInteger(value, field) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`签到商店购买响应字段无效: ${field}`);
	return value;
}
function string(value, field) {
	if (typeof value !== "string") throw new Error(`签到商店购买响应字段无效: ${field}`);
	return value;
}
async function purchaseBackendCheckInShop(bid, uid, productId, buyCount, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(productId) || productId <= 0 || !Number.isSafeInteger(buyCount) || buyCount <= 0) throw new Error("签到商店购买参数无效");
	const data = record(await requestBackend(bid, "post_players_id_check_in_shop_products_productId_purchase", {
		path: {
			id: uid,
			productId
		},
		body: { buyCount },
		...writeContext(request)
	}));
	if (!Array.isArray(data.issued)) throw new Error("签到商店购买响应缺少发放记录");
	return {
		productId: nonNegativeInteger(data.productId, "productId"),
		productName: string(data.productName, "productName"),
		buyCount: nonNegativeInteger(data.buyCount, "buyCount"),
		pricePaid: nonNegativeInteger(data.pricePaid, "pricePaid"),
		grantQuantity: nonNegativeInteger(data.grantQuantity, "grantQuantity"),
		playerName: string(data.playerName, "playerName"),
		signInCoin: nonNegativeInteger(data.signInCoin, "signInCoin"),
		issued: data.issued.map((value) => {
			const issued = record(value);
			if (typeof issued.type !== "string" || typeof issued.name !== "string") throw new Error("签到商店购买发放记录无效");
			return {
				type: issued.type,
				name: issued.name,
				amount: nonNegativeInteger(issued.amount, "issued.amount")
			};
		})
	};
}

//#endregion
export { purchaseBackendCheckInShop };