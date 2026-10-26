import { purchaseBackendCheckInShop } from "../../../api/bot/checkin-shop-purchase.js";

//#region src/response-apps/checkInShop/buy/app.ts
async function App(params) {
	const { bid, uid, productId, buyCount, request } = params;
	if (!Number.isSafeInteger(productId) || !Number.isSafeInteger(buyCount) || buyCount <= 0) return {
		code: "INVALID_FORMAT",
		data: { message: "格式错误，请使用：签到商店购买 序号 [数量]" }
	};
	try {
		const result = await purchaseBackendCheckInShop(bid, uid, productId, buyCount, request);
		return {
			code: "OK",
			data: { message: `【${result.playerName}】购买成功！\n💰 消耗签到币：${result.pricePaid}\n🎁 获得：${result.productName} x${result.grantQuantity}\n💳 剩余签到币：${result.signInCoin}` }
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "签到商店购买失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };