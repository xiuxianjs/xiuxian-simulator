/** Go-owned market write and sellable-asset receipts. */
export interface MarketPriceRange {
  minPrice: number;
  maxPrice: number;
  referencePrice: number;
  source: 'median' | 'base_price' | 'fallback';
  maxListingQuantity: number;
  fixedQuantity: boolean;
  credibilityReady: boolean;
  templateItemId: number;
}

export interface SellableMarketAsset {
  userItemId: number;
  templateId: number;
  name: string;
  category: string;
  type: string;
  subtype: string | null;
  quantity: number;
  gradeId: number | null;
}

export interface SellableMarketAssetPage {
  items: SellableMarketAsset[];
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface MarketPurchaseLine {
  listingId: number;
  sellerUserId: number;
  quantity: number;
  unitPriceAmount: number;
  totalPrice: number;
  systemReclaimed?: boolean;
}

export interface MarketMutationResult {
  listingId?: number;
  itemName?: string;
  quantity?: number;
  totalPrice?: number;
  feeAmount?: number;
  systemReclaimed?: boolean;
  lines?: MarketPurchaseLine[];
  message: string;
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): boolean => typeof value === 'number' && Number.isSafeInteger(value);

export function assertMarketMutationResult(value: unknown, message: string): asserts value is MarketMutationResult {
  if (
    !record(value) ||
    typeof value.message !== 'string' ||
    !['listingId', 'quantity', 'totalPrice', 'feeAmount'].every(key => value[key] === undefined || integer(value[key])) ||
    (value.itemName !== undefined && typeof value.itemName !== 'string') ||
    (value.systemReclaimed !== undefined && typeof value.systemReclaimed !== 'boolean')
  ) {
    throw new Error(message);
  }
  if (value.lines !== undefined) {
    if (!Array.isArray(value.lines)) {
      throw new Error(message);
    }
    for (const line of value.lines) {
      if (
        !record(line) ||
        !['listingId', 'sellerUserId', 'quantity', 'unitPriceAmount', 'totalPrice'].every(key => integer(line[key])) ||
        (line.systemReclaimed !== undefined && typeof line.systemReclaimed !== 'boolean')
      ) {
        throw new Error(message);
      }
    }
  }
}

export function assertMarketPurchasePreview(value: unknown, message: string): asserts value is import('../bot/market-trade').BackendMarketPurchasePreview {
  if (
    !record(value) ||
    !['listingId', 'quantity', 'totalPrice'].every(key => integer(value[key])) ||
    !['itemName', 'currencyName', 'overpriceWarning'].every(key => typeof value[key] === 'string') ||
    typeof value.shouldConfirm !== 'boolean'
  ) {
    throw new Error(message);
  }
}
