//#region src/api/bot/shop-purchase.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const positiveInteger = (value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
function decodeShopPreview(data) {
	if (!record(data) || !positiveInteger(data.productId) || typeof data.shopCode !== "string" || typeof data.name !== "string" || typeof data.paid !== "string" || !positiveInteger(data.granted) || !positiveInteger(data.buyCount) || typeof data.needsConfirmation !== "boolean") throw new Error("商店预检响应不完整");
	return data;
}

//#endregion
export { decodeShopPreview };