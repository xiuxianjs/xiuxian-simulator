// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { PaymentsOperations } from './types.js';
export { paymentsOperationDefinitions } from './operations.js';

export function createPaymentsApi(client: APIClient) {
  return {
    get_players_id_payments_orders: (...args: RequestArguments<'get_players_id_payments_orders'>) => client.request('get_players_id_payments_orders', ...args),
    get_players_id_lootboxes: (...args: RequestArguments<'get_players_id_lootboxes'>) => client.request('get_players_id_lootboxes', ...args),
    get_players_id_gacha_overview: (...args: RequestArguments<'get_players_id_gacha_overview'>) => client.request('get_players_id_gacha_overview', ...args),
    get_players_id_gacha_catalog: (...args: RequestArguments<'get_players_id_gacha_catalog'>) => client.request('get_players_id_gacha_catalog', ...args),
    get_players_id_payments_orders_orderNo_checkout: (...args: RequestArguments<'get_players_id_payments_orders_orderNo_checkout'>) => {
      return client.request('get_players_id_payments_orders_orderNo_checkout', ...args);
    },
    get_capabilities: (...args: RequestArguments<'get_capabilities'>) => {
      return client.request('get_capabilities', ...args);
    },
    get_payments_packages: (...args: RequestArguments<'get_payments_packages'>) => {
      return client.request('get_payments_packages', ...args);
    },
    post_players_id_payments_orders: (...args: RequestArguments<'post_players_id_payments_orders'>) => {
      return client.request('post_players_id_payments_orders', ...args);
    },
    get_players_id_payments_orders_orderNo: (...args: RequestArguments<'get_players_id_payments_orders_orderNo'>) => {
      return client.request('get_players_id_payments_orders_orderNo', ...args);
    },
    post_players_id_payments_orders_orderNo_cancel: (...args: RequestArguments<'post_players_id_payments_orders_orderNo_cancel'>) => {
      return client.request('post_players_id_payments_orders_orderNo_cancel', ...args);
    },
    get_payments_epay_notify: (...args: RequestArguments<'get_payments_epay_notify'>) => {
      return client.request('get_payments_epay_notify', ...args);
    },
    post_payments_epay_notify: (...args: RequestArguments<'post_payments_epay_notify'>) => {
      return client.request('post_payments_epay_notify', ...args);
    },
    get_gacha_active_banner: (...args: RequestArguments<'get_gacha_active_banner'>) => {
      return client.request('get_gacha_active_banner', ...args);
    },
    get_players_id_check_in_shop_products: (...args: RequestArguments<'get_players_id_check_in_shop_products'>) => {
      return client.request('get_players_id_check_in_shop_products', ...args);
    },
    post_players_id_check_in_shop_products_productId_purchase: (...args: RequestArguments<'post_players_id_check_in_shop_products_productId_purchase'>) => {
      return client.request('post_players_id_check_in_shop_products_productId_purchase', ...args);
    },
    get_players_id_shop_products: (...args: RequestArguments<'get_players_id_shop_products'>) => {
      return client.request('get_players_id_shop_products', ...args);
    },
    post_players_id_shop_purchases_preview: (...args: RequestArguments<'post_players_id_shop_purchases_preview'>) => {
      return client.request('post_players_id_shop_purchases_preview', ...args);
    },
    post_players_id_shop_purchases: (...args: RequestArguments<'post_players_id_shop_purchases'>) => {
      return client.request('post_players_id_shop_purchases', ...args);
    },
    get_gacha_banner: (...args: RequestArguments<'get_gacha_banner'>) => {
      return client.request('get_gacha_banner', ...args);
    },
    post_players_id_gacha_pulls: (...args: RequestArguments<'post_players_id_gacha_pulls'>) => {
      return client.request('post_players_id_gacha_pulls', ...args);
    },
    post_players_id_lootboxes_open: (...args: RequestArguments<'post_players_id_lootboxes_open'>) => {
      return client.request('post_players_id_lootboxes_open', ...args);
    },
    get_gacha_pools_poolId_items: (...args: RequestArguments<'get_gacha_pools_poolId_items'>) => {
      return client.request('get_gacha_pools_poolId_items', ...args);
    },
    get_players_id_gacha_pools_poolId_pity: (...args: RequestArguments<'get_players_id_gacha_pools_poolId_pity'>) => {
      return client.request('get_players_id_gacha_pools_poolId_pity', ...args);
    },
    get_players_id_gacha_pools_poolId_history: (...args: RequestArguments<'get_players_id_gacha_pools_poolId_history'>) => {
      return client.request('get_players_id_gacha_pools_poolId_history', ...args);
    },
    post_players_id_gacha_pools_poolId_pull: (...args: RequestArguments<'post_players_id_gacha_pools_poolId_pull'>) => {
      return client.request('post_players_id_gacha_pools_poolId_pull', ...args);
    },
    get_players_id_limited_events_shop_products: (...args: RequestArguments<'get_players_id_limited_events_shop_products'>) => {
      return client.request('get_players_id_limited_events_shop_products', ...args);
    },
    post_players_id_limited_events_shop_products_productId_purchase: (
      ...args: RequestArguments<'post_players_id_limited_events_shop_products_productId_purchase'>
    ) => {
      return client.request('post_players_id_limited_events_shop_products_productId_purchase', ...args);
    }
  };
}
