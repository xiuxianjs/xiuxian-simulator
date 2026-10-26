import { inventoryOperationDefinitions } from "./operations.js";

//#region src/api/domains/inventory/index.ts
function createInventoryApi(client) {
	return {
		post_players_id_mingwu_dan_confirm: (...args) => {
			return client.request("post_players_id_mingwu_dan_confirm", ...args);
		},
		post_players_id_consume: (...args) => {
			return client.request("post_players_id_consume", ...args);
		},
		post_players_id_storage_lock_state: (...args) => {
			return client.request("post_players_id_storage_lock_state", ...args);
		},
		get_players_id_currencies: (...args) => {
			return client.request("get_players_id_currencies", ...args);
		},
		get_players_id_inventory: (...args) => {
			return client.request("get_players_id_inventory", ...args);
		},
		get_players_id_inventory_space: (...args) => {
			return client.request("get_players_id_inventory_space", ...args);
		}
	};
}

//#endregion
export { createInventoryApi, inventoryOperationDefinitions };