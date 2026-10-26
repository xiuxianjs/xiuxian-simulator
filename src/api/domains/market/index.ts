// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { MarketOperations } from './types.js';
export { marketOperationDefinitions } from './operations.js';

export function createMarketApi(client: APIClient) {
  return {
    post_players_id_market_workflow: (...args: RequestArguments<'post_players_id_market_workflow'>) => client.request('post_players_id_market_workflow', ...args),
    get_players_id_market_purchases_preview: (...args: RequestArguments<'get_players_id_market_purchases_preview'>) => {
      return client.request('get_players_id_market_purchases_preview', ...args);
    },
    get_players_id_market_shops_ownerId_browse: (...args: RequestArguments<'get_players_id_market_shops_ownerId_browse'>) => {
      return client.request('get_players_id_market_shops_ownerId_browse', ...args);
    },
    get_players_id_market_browse: (...args: RequestArguments<'get_players_id_market_browse'>) => {
      return client.request('get_players_id_market_browse', ...args);
    },
    get_players_id_companion_shop: (...args: RequestArguments<'get_players_id_companion_shop'>) => client.request('get_players_id_companion_shop', ...args),
    get_market_listings: (...args: RequestArguments<'get_market_listings'>) => {
      return client.request('get_market_listings', ...args);
    },
    get_market_listings_listingId: (...args: RequestArguments<'get_market_listings_listingId'>) => {
      return client.request('get_market_listings_listingId', ...args);
    },
    get_market_listings_attributes: (...args: RequestArguments<'get_market_listings_attributes'>) => {
      return client.request('get_market_listings_attributes', ...args);
    },
    get_market_lowest_price: (...args: RequestArguments<'get_market_lowest_price'>) => {
      return client.request('get_market_lowest_price', ...args);
    },
    get_market_average_price: (...args: RequestArguments<'get_market_average_price'>) => {
      return client.request('get_market_average_price', ...args);
    },
    get_market_shops: (...args: RequestArguments<'get_market_shops'>) => {
      return client.request('get_market_shops', ...args);
    },
    get_market_shops_ranking: (...args: RequestArguments<'get_market_shops_ranking'>) => {
      return client.request('get_market_shops_ranking', ...args);
    },
    get_market_shops_userId: (...args: RequestArguments<'get_market_shops_userId'>) => {
      return client.request('get_market_shops_userId', ...args);
    },
    get_players_id_market_purchase_quota: (...args: RequestArguments<'get_players_id_market_purchase_quota'>) => {
      return client.request('get_players_id_market_purchase_quota', ...args);
    },
    get_players_id_market_price_range: (...args: RequestArguments<'get_players_id_market_price_range'>) => {
      return client.request('get_players_id_market_price_range', ...args);
    },
    get_players_id_market_credibility: (...args: RequestArguments<'get_players_id_market_credibility'>) => {
      return client.request('get_players_id_market_credibility', ...args);
    },
    get_players_id_market_trades: (...args: RequestArguments<'get_players_id_market_trades'>) => {
      return client.request('get_players_id_market_trades', ...args);
    },
    get_players_id_market_sellable: (...args: RequestArguments<'get_players_id_market_sellable'>) => {
      return client.request('get_players_id_market_sellable', ...args);
    },
    get_players_id_market_shop: (...args: RequestArguments<'get_players_id_market_shop'>) => {
      return client.request('get_players_id_market_shop', ...args);
    },
    post_players_id_market_shop_ensure: (...args: RequestArguments<'post_players_id_market_shop_ensure'>) => {
      return client.request('post_players_id_market_shop_ensure', ...args);
    },
    put_players_id_market_shop_name: (...args: RequestArguments<'put_players_id_market_shop_name'>) => {
      return client.request('put_players_id_market_shop_name', ...args);
    },
    put_players_id_market_shop_description: (...args: RequestArguments<'put_players_id_market_shop_description'>) => {
      return client.request('put_players_id_market_shop_description', ...args);
    },
    post_players_id_market_listings: (...args: RequestArguments<'post_players_id_market_listings'>) => {
      return client.request('post_players_id_market_listings', ...args);
    },
    post_players_id_market_listings_listingId_cancel: (...args: RequestArguments<'post_players_id_market_listings_listingId_cancel'>) => {
      return client.request('post_players_id_market_listings_listingId_cancel', ...args);
    },
    post_players_id_market_purchases: (...args: RequestArguments<'post_players_id_market_purchases'>) => {
      return client.request('post_players_id_market_purchases', ...args);
    }
  };
}
