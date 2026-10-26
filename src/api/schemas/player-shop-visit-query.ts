import type { MyMarketInstance } from './my-market-listings';
import type { CurrencyCardData } from './queries';

export interface PlayerShopVisitItem {
  listingId: number;
  sellerUserId: number;
  sellerName: string;
  itemCategory: string;
  itemCategoryLabel: string;
  itemType: string | null;
  itemSubtype: string | null;
  templateItemId: number | null;
  itemName: string;
  quantity: number;
  unitPriceAmount: number;
  currencyCode: string;
  currencyName: string;
  canPurchase: boolean;
  purchaseUnavailableReason: string | null;
  hasUpgraded?: boolean;
  status: number;
  lockedUntil: string | null;
  attributeAvailable: boolean;
  attributes: MyMarketInstance | null;
  attributeView: { attrText: string | null; hidden: boolean } | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface PlayerShopVisitData {
  currencies: CurrencyCardData;
  shop: {
    shopId: number;
    userId: number;
    ownerName: string;
    shopName: string;
    description?: string | null;
    heatScore: number;
    totalSales: number;
    totalVolume: number;
    level: number;
    levelName: string;
    status: number;
    activeListings: number;
  } | null;
  items: PlayerShopVisitItem[];
  pagination: { currentPage: number; totalPages: number; total: number };
}

export function assertPlayerShopInfo(value: unknown, message: string): asserts value is NonNullable<PlayerShopVisitData['shop']> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
  const row = value as Record<string, unknown>;

  if (
    !['shopId', 'userId', 'heatScore', 'totalSales', 'totalVolume', 'level', 'status', 'activeListings'].every(
      key => typeof row[key] === 'number' && Number.isSafeInteger(row[key])
    ) ||
    !['ownerName', 'shopName', 'levelName'].every(key => typeof row[key] === 'string') ||
    (row.description !== undefined && row.description !== null && typeof row.description !== 'string')
  ) {
    throw new Error(message);
  }
}
