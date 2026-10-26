import { assertMyMarketInstance } from './my-market-listings';
import type { MarketBrowseItem } from './market-browse-query';

const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isDate = (value: unknown): boolean => typeof value === 'string' && Number.isFinite(Date.parse(value));

export function assertMarketBrowseItem(item: unknown, message: string): asserts item is MarketBrowseItem {
  if (
    !isRecord(item) ||
    !item ||
    ![item.listingId, item.sellerUserId, item.quantity, item.unitPriceAmount].every(isInteger) ||
    ![item.sellerName, item.itemCategory, item.itemCategoryLabel, item.itemName, item.currencyCode, item.currencyName, item.upgradeHint].every(
      field => typeof field === 'string'
    ) ||
    ![item.itemType, item.itemSubtype].every(field => field === null || typeof field === 'string') ||
    (item.templateItemId !== null && !isInteger(item.templateItemId)) ||
    (item.hasUpgraded !== undefined && typeof item.hasUpgraded !== 'boolean') ||
    !isDate(item.createdAt) ||
    (item.expiresAt !== null && !isDate(item.expiresAt)) ||
    typeof item.attributeAvailable !== 'boolean' ||
    typeof item.canPurchase !== 'boolean' ||
    (item.purchaseUnavailableReason !== null && typeof item.purchaseUnavailableReason !== 'string') ||
    (item.attributes !== null && !isRecord(item.attributes)) ||
    (item.attributeView !== null &&
      (!isRecord(item.attributeView) ||
        typeof item.attributeView.hidden !== 'boolean' ||
        (item.attributeView.attrText !== null && typeof item.attributeView.attrText !== 'string')))
  ) {
    throw new Error(message);
  }
  assertMyMarketInstance(item.attributes, message);
}
