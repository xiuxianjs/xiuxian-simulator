import { marketOperationDefinitions } from "./operations.js";

//#region src/api/domains/market/index.ts
function createMarketApi(client) {
	return {
		post_players_id_market_workflow: (...args) => client.request("post_players_id_market_workflow", ...args),
		get_players_id_market_purchases_preview: (...args) => {
			return client.request("get_players_id_market_purchases_preview", ...args);
		},
		get_players_id_market_shops_ownerId_browse: (...args) => {
			return client.request("get_players_id_market_shops_ownerId_browse", ...args);
		},
		get_players_id_market_browse: (...args) => {
			return client.request("get_players_id_market_browse", ...args);
		},
		get_players_id_companion_shop: (...args) => client.request("get_players_id_companion_shop", ...args),
		get_market_listings: (...args) => {
			return client.request("get_market_listings", ...args);
		},
		get_market_listings_listingId: (...args) => {
			return client.request("get_market_listings_listingId", ...args);
		},
		get_market_listings_attributes: (...args) => {
			return client.request("get_market_listings_attributes", ...args);
		},
		get_market_lowest_price: (...args) => {
			return client.request("get_market_lowest_price", ...args);
		},
		get_market_average_price: (...args) => {
			return client.request("get_market_average_price", ...args);
		},
		get_market_shops: (...args) => {
			return client.request("get_market_shops", ...args);
		},
		get_market_shops_ranking: (...args) => {
			return client.request("get_market_shops_ranking", ...args);
		},
		get_market_shops_userId: (...args) => {
			return client.request("get_market_shops_userId", ...args);
		},
		get_players_id_market_purchase_quota: (...args) => {
			return client.request("get_players_id_market_purchase_quota", ...args);
		},
		get_players_id_market_price_range: (...args) => {
			return client.request("get_players_id_market_price_range", ...args);
		},
		get_players_id_market_credibility: (...args) => {
			return client.request("get_players_id_market_credibility", ...args);
		},
		get_players_id_market_trades: (...args) => {
			return client.request("get_players_id_market_trades", ...args);
		},
		get_players_id_market_sellable: (...args) => {
			return client.request("get_players_id_market_sellable", ...args);
		},
		get_players_id_market_shop: (...args) => {
			return client.request("get_players_id_market_shop", ...args);
		},
		post_players_id_market_shop_ensure: (...args) => {
			return client.request("post_players_id_market_shop_ensure", ...args);
		},
		put_players_id_market_shop_name: (...args) => {
			return client.request("put_players_id_market_shop_name", ...args);
		},
		put_players_id_market_shop_description: (...args) => {
			return client.request("put_players_id_market_shop_description", ...args);
		},
		post_players_id_market_listings: (...args) => {
			return client.request("post_players_id_market_listings", ...args);
		},
		post_players_id_market_listings_listingId_cancel: (...args) => {
			return client.request("post_players_id_market_listings_listingId_cancel", ...args);
		},
		post_players_id_market_purchases: (...args) => {
			return client.request("post_players_id_market_purchases", ...args);
		}
	};
}

//#endregion
export { createMarketApi, marketOperationDefinitions };