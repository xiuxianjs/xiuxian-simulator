import type { BackendMarketPurchasePreview } from '../bot/market-trade';
import type { MarketMutationResult } from './market-trade';
import type { MarketCredibilityInfo } from './market-credibility';
import type { MyMarketListingPage } from './my-market-listings';
import type { GlossaryPolicy, GlossaryEditQuotaData } from './glossary-upsert';
import type { GlossaryQueryEntry } from './glossary-query';
export interface MarketWorkflowInput {
  action: 'sell' | 'purchase' | 'credibility' | 'listings';
  category?: string;
  userItemId?: number;
  firstNumber?: number;
  secondNumber?: number;
  listingId?: number;
  quantity?: number;
  confirmed?: boolean;
  readOnly?: boolean;
  page?: number;
}
export interface MarketWorkflowResult {
  range?: import('../bot/market-trade').BackendMarketPriceRange;
  listingError?: { message: string; code: string };
  preview?: BackendMarketPurchasePreview;
  receipt?: MarketMutationResult;
  credibility?: MarketCredibilityInfo;
  listings?: MyMarketListingPage;
}
export interface GlossaryViewResult {
  policy?: GlossaryPolicy;
  quota?: GlossaryEditQuotaData;
  exact: GlossaryQueryEntry | null;
  page?: { items: GlossaryQueryEntry[]; total: number; page: number; pageSize: number };
}
