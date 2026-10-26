import type { MarketWorkflowInput, MarketWorkflowResult } from '../../schemas/market-community-views';
import type { CompanionShopQueryData } from '../../schemas/companion-shop-query';
import type { PlayerShopQueryPage, PlayerShopRankingQueryItem } from '../../schemas/shop-query';
import type { MarketTradeRecordsData } from '../../schemas/queries';
import type { PlayerShopDescriptionUpdateResult } from '../../schemas/player-shop-description';
import type { PlayerShopEnsureResult, PlayerShopOwnQueryData } from '../../schemas/player-shop-own';
import type { PlayerShopRenameResult } from '../../schemas/player-shop-rename';
import type { MarketCredibilityInfo, MarketCredibilityInitializeResult } from '../../schemas/market-credibility';
import type { MyMarketListingPage, MarketListingLockRefreshResult } from '../../schemas/my-market-listings';
import type { MarketCancelResult } from '../../schemas/market-cancel';
import type { MarketBrowseData, MarketBrowseSort } from '../../schemas/market-browse-query';
import type { PlayerShopVisitData } from '../../schemas/player-shop-visit-query';
import type { MarketMutationResult, MarketPriceRange, SellableMarketAssetPage } from '../../schemas/market-trade';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface MarketOperations {
  post_players_id_market_workflow: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: MarketWorkflowInput;
    response: MarketWorkflowResult;
  };
  get_players_id_market_purchases_preview: {
    path: { id: number };
    query: { listingId: number; quantity: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: {
      listingId: number;
      itemName: string;
      quantity: number;
      totalPrice: number;
      currencyName: string;
      shouldConfirm: boolean;
      overpriceWarning: string;
    } | null;
  };
  get_players_id_market_shops_ownerId_browse: {
    path: { id: number; ownerId: number };
    query: { page?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: PlayerShopVisitData;
  };

  get_players_id_market_browse: {
    path: { id: number };
    query: { categoryType?: string; categorySubtype?: string; keyword?: string; sort?: MarketBrowseSort; page?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: MarketBrowseData;
  };
  get_players_id_market_listings: {
    path: { id: number };
    query: { page?: number };
    headers: never;
    body: never;
    response: MyMarketListingPage;
  };
  post_players_id_market_listings_refresh_locks: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: MarketListingLockRefreshResult;
  };
  get_players_id_companion_shop: {
    path: { id: number };
    query: { page?: number; currencyCode?: 'SPIRIT_STONE' | 'SPIRIT_CRYSTAL' | 'SPIRIT_MILK' };
    headers: never;
    body: never;
    response: CompanionShopQueryData;
  };
  get_market_listings: {
    path: never;
    query: { category?: string; keyword?: string; sort?: string; page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_market_listings_listingId: { path: { listingId: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_market_listings_attributes: { path: never; query: { ids: string }; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_market_lowest_price: {
    path: never;
    query: { category: string; templateItemId: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_market_average_price: {
    path: never;
    query: { itemName: string; currencyCode: string };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_market_shops: {
    path: never;
    query: { cursor?: string; page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: PlayerShopQueryPage;
  };
  get_market_shops_ranking: {
    path: never;
    query: { topN?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: PlayerShopRankingQueryItem[];
  };
  get_market_shops_userId: { path: { userId: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_market_purchase_quota: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_market_price_range: {
    path: { id: number };
    query: { category: string; userItemId: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: MarketPriceRange | null;
  };
  get_players_id_market_credibility: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: MarketCredibilityInfo };
  post_players_id_market_credibility_initialize: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: MarketCredibilityInitializeResult;
  };
  get_players_id_market_trades: {
    path: { id: number };
    query: { mode?: string; page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: MarketTradeRecordsData;
  };
  get_players_id_market_sellable: {
    path: { id: number };
    query: { category?: string; subtype?: string; page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: SellableMarketAssetPage;
  };
  get_players_id_market_shop: { path: { id: number }; query: never; headers: never; body: never; response: PlayerShopOwnQueryData };
  post_players_id_market_shop_ensure: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: never;
    response: PlayerShopEnsureResult;
  };
  put_players_id_market_shop_name: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { name: string };
    response: PlayerShopRenameResult;
  };
  put_players_id_market_shop_description: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { description: string };
    response: PlayerShopDescriptionUpdateResult;
  };
  post_players_id_market_listings: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { category: string; currencyCode?: string; quantity?: number; unitPriceAmount: number; userItemId: number };
    response: MarketMutationResult;
  };
  post_players_id_market_listings_listingId_cancel: {
    path: { id: number; listingId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: MarketCancelResult;
  };
  post_players_id_market_purchases: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { listingId: number; quantity?: number };
    response: MarketMutationResult;
  };
}
