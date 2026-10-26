import { paymentsOperationDefinitions } from "./operations.js";

//#region src/api/domains/payments/index.ts
function createPaymentsApi(client) {
	return {
		get_players_id_payments_orders: (...args) => client.request("get_players_id_payments_orders", ...args),
		get_players_id_lootboxes: (...args) => client.request("get_players_id_lootboxes", ...args),
		get_players_id_gacha_overview: (...args) => client.request("get_players_id_gacha_overview", ...args),
		get_players_id_gacha_catalog: (...args) => client.request("get_players_id_gacha_catalog", ...args),
		get_players_id_payments_orders_orderNo_checkout: (...args) => {
			return client.request("get_players_id_payments_orders_orderNo_checkout", ...args);
		},
		get_capabilities: (...args) => {
			return client.request("get_capabilities", ...args);
		},
		get_payments_packages: (...args) => {
			return client.request("get_payments_packages", ...args);
		},
		post_players_id_payments_orders: (...args) => {
			return client.request("post_players_id_payments_orders", ...args);
		},
		get_players_id_payments_orders_orderNo: (...args) => {
			return client.request("get_players_id_payments_orders_orderNo", ...args);
		},
		post_players_id_payments_orders_orderNo_cancel: (...args) => {
			return client.request("post_players_id_payments_orders_orderNo_cancel", ...args);
		},
		get_payments_epay_notify: (...args) => {
			return client.request("get_payments_epay_notify", ...args);
		},
		post_payments_epay_notify: (...args) => {
			return client.request("post_payments_epay_notify", ...args);
		},
		get_gacha_active_banner: (...args) => {
			return client.request("get_gacha_active_banner", ...args);
		},
		get_players_id_check_in_shop_products: (...args) => {
			return client.request("get_players_id_check_in_shop_products", ...args);
		},
		post_players_id_check_in_shop_products_productId_purchase: (...args) => {
			return client.request("post_players_id_check_in_shop_products_productId_purchase", ...args);
		},
		get_players_id_shop_products: (...args) => {
			return client.request("get_players_id_shop_products", ...args);
		},
		post_players_id_shop_purchases_preview: (...args) => {
			return client.request("post_players_id_shop_purchases_preview", ...args);
		},
		post_players_id_shop_purchases: (...args) => {
			return client.request("post_players_id_shop_purchases", ...args);
		},
		get_gacha_banner: (...args) => {
			return client.request("get_gacha_banner", ...args);
		},
		post_players_id_gacha_pulls: (...args) => {
			return client.request("post_players_id_gacha_pulls", ...args);
		},
		post_players_id_lootboxes_open: (...args) => {
			return client.request("post_players_id_lootboxes_open", ...args);
		},
		get_gacha_pools_poolId_items: (...args) => {
			return client.request("get_gacha_pools_poolId_items", ...args);
		},
		get_players_id_gacha_pools_poolId_pity: (...args) => {
			return client.request("get_players_id_gacha_pools_poolId_pity", ...args);
		},
		get_players_id_gacha_pools_poolId_history: (...args) => {
			return client.request("get_players_id_gacha_pools_poolId_history", ...args);
		},
		post_players_id_gacha_pools_poolId_pull: (...args) => {
			return client.request("post_players_id_gacha_pools_poolId_pull", ...args);
		},
		get_players_id_limited_events_shop_products: (...args) => {
			return client.request("get_players_id_limited_events_shop_products", ...args);
		},
		post_players_id_limited_events_shop_products_productId_purchase: (...args) => {
			return client.request("post_players_id_limited_events_shop_products_productId_purchase", ...args);
		}
	};
}

//#endregion
export { createPaymentsApi, paymentsOperationDefinitions };