import { partnersOperationDefinitions } from "./operations.js";

//#region src/api/domains/partners/index.ts
function createPartnersApi(client) {
	return {
		post_players_id_companion_shop_purchases_preview: (...args) => {
			return client.request("post_players_id_companion_shop_purchases_preview", ...args);
		},
		post_players_id_companion_shop_purchases: (...args) => {
			return client.request("post_players_id_companion_shop_purchases", ...args);
		},
		get_players_id_companion_proposal_preflight: (...args) => {
			return client.request("get_players_id_companion_proposal_preflight", ...args);
		},
		get_players_id_companion: (...args) => {
			return client.request("get_players_id_companion", ...args);
		},
		delete_players_id_companion: (...args) => {
			return client.request("delete_players_id_companion", ...args);
		},
		post_players_id_companion_proposals: (...args) => {
			return client.request("post_players_id_companion_proposals", ...args);
		},
		post_players_id_companion_proposals_proposerId_accept: (...args) => {
			return client.request("post_players_id_companion_proposals_proposerId_accept", ...args);
		},
		post_players_id_companion_proposals_proposerId_reject: (...args) => {
			return client.request("post_players_id_companion_proposals_proposerId_reject", ...args);
		},
		get_players_id_companion_tasks: (...args) => {
			return client.request("get_players_id_companion_tasks", ...args);
		},
		get_players_id_companion_panel_status: (...args) => {
			return client.request("get_players_id_companion_panel_status", ...args);
		},
		get_players_id_companion_oath_items: (...args) => {
			return client.request("get_players_id_companion_oath_items", ...args);
		},
		get_players_id_companion_oath_upgrade: (...args) => {
			return client.request("get_players_id_companion_oath_upgrade", ...args);
		},
		post_players_id_companion_oath_upgrade: (...args) => {
			return client.request("post_players_id_companion_oath_upgrade", ...args);
		},
		post_players_id_companion_dual_cultivation: (...args) => {
			return client.request("post_players_id_companion_dual_cultivation", ...args);
		},
		get_players_id_companion_gifts: (...args) => {
			return client.request("get_players_id_companion_gifts", ...args);
		},
		post_players_id_companion_gifts: (...args) => {
			return client.request("post_players_id_companion_gifts", ...args);
		}
	};
}

//#endregion
export { createPartnersApi, partnersOperationDefinitions };