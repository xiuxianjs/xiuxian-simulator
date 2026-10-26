import type { MyMarketInstance } from './my-market-listings';

export type MarketBrowseSort = 'latest' | 'price_asc' | 'price_desc' | 'grade_asc' | 'grade_desc';

export interface MarketBrowseItem {
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
  upgradeHint: string;
  attributeAvailable: boolean;
  attributes: MyMarketInstance | null;
  attributeView: { attrText: string | null; hidden: boolean } | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface MarketBrowseData {
  spiritsCrystal: number;
  quota: { dailyLimit: number; dailyUsed: number; remaining: number };
  items: MarketBrowseItem[];
  pagination: { currentPage: number; totalPages: number; total: number };
}
