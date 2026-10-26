import type { CurrencyCardData } from './queries';

export interface ShopListProductItem {
  productId: number;
  shopCode: string;
  name: string;
  category: string;
  itemId?: number;
  priceAmount: number;
  priceCurrencyName?: string;
  secondaryPriceAmount?: number;
  secondaryPriceCurrencyName?: string;
  grantCurrencyName?: string;
  quantity: number;
  used: number;
  limit: number;
  limitPeriodCN: string;
  remaining: number;
  unlocked: boolean;
  lockReason?: string;
  discountPriceAmount?: number;
  discountLabel?: string;
  typeLabel?: string;
}

export interface ShopListProductsResult {
  success: true;
  data: ShopListProductItem[];
  pagination: { total: number; totalPages: number; currentPage: number };
  balance?: Record<string, number>;
}

export interface CompanionShopQueryData {
  nextCursor?: string;
  access: { hasCompanion: boolean; isFoundationRealm: boolean; canUseReputationShop: boolean; visibleShopCodes: string[]; deniedReason: string | null };
  currencies: CurrencyCardData;
  products: Array<{
    shopCode: string;
    discountRate: number | null;
    discountLabel: string | null;
    discountPriceAmount: number | null;
    nextPurchaseAt: string | null;
    productId: number;
    name: string;
    category: string;
    itemId: number | null;
    priceAmount: number;
    priceCurrencyCode: string;
    priceCurrencyName: string | null;
    secondaryPriceAmount: number | null;
    secondaryPriceCurrencyCode: string | null;
    secondaryPriceCurrencyName: string | null;
    grantCurrencyCode: string | null;
    grantCurrencyName: string | null;
    quantity: number;
    used: number;
    limit: number;
    limitPeriod: string;
    limitPeriodName: string;
    remaining: number;
    unlocked: boolean;
    itemType: string | null;
    itemSubtype: string | null;
    typeLabel: string;
    requiredRealmId: number | null;
    requiredRealmName: string | null;
    requiredStars: number | null;
    lockReason: string | null;
  }>;
  page: number;
  totalPages: number;
  total: number;
}
