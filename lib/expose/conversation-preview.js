//#region src/expose/conversation-preview.ts
function previewText(operation, value) {
	const quote = value;
	const preview = quote?.preview;
	if (operation === "peiyuan.confirm" && typeof quote?.expiresAt === "string" && Number.isSafeInteger(quote.pending?.quantity) && Array.isArray(quote.pending?.changes) && quote.pending.changes.every((change) => typeof change.attributeName === "string" && [
		change.oldValue,
		change.newValue,
		change.change
	].every(Number.isFinite))) return `原培元结果\n已消耗丹药：${quote.pending.quantity}\n${quote.pending.changes.map((change) => `${change.attributeName}：${change.oldValue} → ${change.newValue}（变化 ${change.change}）`).join("\n")}\n原有效期至：${quote.expiresAt}\n放弃不会返还已消耗丹药。`;
	if (["treasures.preview", "treasures.daily-pack-free-preview"].includes(operation) && typeof quote?.confirmationRef === "string" && typeof quote.expiresAt === "string" && Array.isArray(quote.summary) && quote.summary.length > 0 && quote.summary.every((line) => typeof line === "string")) return `原宝物预览\n${quote.summary.join("\n")}\n有效期至：${quote.expiresAt}`;
	if (!preview || typeof quote?.expiresAt !== "string") return "";
	if (operation === "shops.purchase" && typeof preview.name === "string" && typeof preview.paid === "string" && Number.isSafeInteger(preview.buyCount) && Number.isSafeInteger(preview.granted)) return `原购买预览\n商品：${preview.name}\n购买份数：${preview.buyCount}\n获得数量：${preview.granted}\n原报价：${preview.paid}\n有效期至：${quote.expiresAt}`;
	if (operation === "market.purchase" && typeof preview.itemName === "string" && typeof preview.currencyName === "string" && Number.isSafeInteger(preview.quantity) && Number.isSafeInteger(preview.totalPrice)) return `原选购预览\n商品：${preview.itemName}\n数量：${preview.quantity}\n原总价：${preview.totalPrice} ${preview.currencyName}\n${preview.overpriceWarning ?? ""}\n有效期至：${quote.expiresAt}`;
	return "";
}
function conversationPreview(operation, value) {
	const row = value;
	const reference = row?.reference ?? row?.confirmationRef;
	if (typeof reference !== "string" || !reference) return;
	const text = previewText(operation, value);
	return text ? {
		reference,
		text
	} : void 0;
}

//#endregion
export { conversationPreview };