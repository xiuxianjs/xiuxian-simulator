import type { EventShopQueryGroup } from '../../schemas/event-shop-query';
import type { CatalogShopQueryData } from '../../schemas/unified-shop-query';
import type { CheckInShopQueryData } from '../../schemas/checkin-shop-query';
import type { LootboxListData, GachaOverviewData, GachaCatalogData, GachaHistoryData, GachaGoodsTierData } from '../../schemas/queries';
import type { SponsorStatusData } from '../../schemas/sponsor-status';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface PaymentsOperations {
  get_players_id_payments_orders: { path: { id: number }; query: { page?: number; pageSize?: number }; headers: never; body: never; response: unknown };
  get_players_id_lootboxes: { path: { id: number }; query: { page?: number }; headers: never; body: never; response: LootboxListData };
  get_players_id_gacha_overview: { path: { id: number }; query: never; headers: never; body: never; response: GachaOverviewData };
  get_players_id_gacha_catalog: { path: { id: number }; query: never; headers: never; body: never; response: GachaCatalogData };
  get_players_id_payments_orders_orderNo_checkout: { path: { id: number; orderNo: string }; query: never; headers: never; body: never; response: unknown };
  get_capabilities: { path: never; query: never; headers: never; body: never; response: unknown };
  get_payments_packages: { path: never; query: never; headers: never; body: never; response: unknown };
  get_players_id_payments_sponsor_status: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: SponsorStatusData;
  };
  post_players_id_payments_orders: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string };
    body: { kind: 'package' | 'limited_event' | 'sponsor'; packageId?: number; subActivityId?: number; tierLevel?: number; amountYuan?: number };
    response: unknown;
  };
  get_players_id_payments_orders_orderNo: { path: { id: number; orderNo: string }; query: never; headers: never; body: never; response: unknown };
  get_players_id_payments_orders_orderNo_settlement: { path: { id: number; orderNo: string }; query: never; headers: never; body: never; response: unknown };
  get_players_id_payments_orders_orderNo_limited_event_settlement: {
    path: { id: number; orderNo: string };
    query: never;
    headers: never;
    body: never;
    response: unknown;
  };
  post_players_id_payments_orders_orderNo_cancel: {
    path: { id: number; orderNo: string };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: never;
    response: unknown;
  };
  get_payments_epay_notify: {
    path: never;
    query: { pid: string; out_trade_no: string; trade_no: string; trade_status: string; money: string; timestamp: string; sign: string; sign_type: string };
    headers: never;
    body: never;
    response: 'success';
  };
  post_payments_epay_notify: {
    path: never;
    query: never;
    headers: never;
    body: { pid: string; out_trade_no: string; trade_no: string; trade_status: string; money: string; timestamp: string; sign: string; sign_type: string };
    response: 'success';
  };
  get_gacha_active_banner: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_check_in_shop_products: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: CheckInShopQueryData;
  };
  post_players_id_check_in_shop_products_productId_purchase: {
    path: { id: number; productId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { buyCount?: number };
    response: unknown;
  };
  get_players_id_shop_products: {
    path: { id: number };
    query: { cursor?: string; shopCode?: string; currencyCode?: string; page?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: CatalogShopQueryData;
  };
  post_players_id_shop_purchases_preview: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { count?: number; productId: number };
    response: unknown;
  };
  post_players_id_shop_purchases: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { count?: number; productId: number };
    response: unknown;
  };
  get_gacha_banner: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_gacha_pulls: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { poolId: number; pullCount?: 1 | 10 };
    response: unknown;
  };
  post_players_id_lootboxes_open: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: ({ lootboxId: number; lootboxName?: never } | { lootboxId?: never; lootboxName: string }) & { openCount?: number; treasureId?: number };
    response: unknown;
  };
  get_gacha_pools_poolId_items: { path: { poolId: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: GachaGoodsTierData[] };
  get_players_id_gacha_pools_poolId_pity: {
    path: { id: number; poolId: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_gacha_pools_poolId_history: {
    path: { id: number; poolId: number };
    query: { limit?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: GachaHistoryData[];
  };
  post_players_id_gacha_pools_poolId_pull: {
    path: { id: number; poolId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { count: number };
    response: unknown;
  };
  get_players_id_limited_events_shop_products: {
    path: { id: number };
    query: { shopType: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: EventShopQueryGroup[];
  };
  post_players_id_limited_events_shop_products_productId_purchase: {
    path: { id: number; productId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { buyCount?: number };
    response: unknown;
  };
}
