//#region src/api/schemas/market-trade.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
function assertMarketMutationResult(value, message) {
	if (!record(value) || typeof value.message !== "string" || ![
		"listingId",
		"quantity",
		"totalPrice",
		"feeAmount"
	].every((key) => value[key] === void 0 || integer(value[key])) || value.itemName !== void 0 && typeof value.itemName !== "string" || value.systemReclaimed !== void 0 && typeof value.systemReclaimed !== "boolean") throw new Error(message);
	if (value.lines !== void 0) {
		if (!Array.isArray(value.lines)) throw new Error(message);
		for (const line of value.lines) if (!record(line) || ![
			"listingId",
			"sellerUserId",
			"quantity",
			"unitPriceAmount",
			"totalPrice"
		].every((key) => integer(line[key])) || line.systemReclaimed !== void 0 && typeof line.systemReclaimed !== "boolean") throw new Error(message);
	}
}
function assertMarketPurchasePreview(value, message) {
	if (!record(value) || ![
		"listingId",
		"quantity",
		"totalPrice"
	].every((key) => integer(value[key])) || ![
		"itemName",
		"currencyName",
		"overpriceWarning"
	].every((key) => typeof value[key] === "string") || typeof value.shouldConfirm !== "boolean") throw new Error(message);
}

//#endregion
export { assertMarketMutationResult, assertMarketPurchasePreview };