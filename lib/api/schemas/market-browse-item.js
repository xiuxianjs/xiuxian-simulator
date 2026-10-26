import { assertMyMarketInstance } from "./my-market-listings.js";

//#region src/api/schemas/market-browse-item.ts
const isInteger = (value) => typeof value === "number" && Number.isSafeInteger(value);
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isDate = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
function assertMarketBrowseItem(item, message) {
	if (!isRecord(item) || !item || ![
		item.listingId,
		item.sellerUserId,
		item.quantity,
		item.unitPriceAmount
	].every(isInteger) || ![
		item.sellerName,
		item.itemCategory,
		item.itemCategoryLabel,
		item.itemName,
		item.currencyCode,
		item.currencyName,
		item.upgradeHint
	].every((field) => typeof field === "string") || ![item.itemType, item.itemSubtype].every((field) => field === null || typeof field === "string") || item.templateItemId !== null && !isInteger(item.templateItemId) || item.hasUpgraded !== void 0 && typeof item.hasUpgraded !== "boolean" || !isDate(item.createdAt) || item.expiresAt !== null && !isDate(item.expiresAt) || typeof item.attributeAvailable !== "boolean" || typeof item.canPurchase !== "boolean" || item.purchaseUnavailableReason !== null && typeof item.purchaseUnavailableReason !== "string" || item.attributes !== null && !isRecord(item.attributes) || item.attributeView !== null && (!isRecord(item.attributeView) || typeof item.attributeView.hidden !== "boolean" || item.attributeView.attrText !== null && typeof item.attributeView.attrText !== "string")) throw new Error(message);
	assertMyMarketInstance(item.attributes, message);
}

//#endregion
export { assertMarketBrowseItem };