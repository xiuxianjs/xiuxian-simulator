import { crossPlatformOperationDefinitions } from "./operations.js";

//#region src/api/domains/cross-platform/index.ts
function createCrossPlatformApi(client) {
	return {
		post_players_id_tasks_config_actions: (...args) => client.request("post_players_id_tasks_config_actions", ...args),
		post_players_id_tasks_slots_slot_steps: (...args) => client.request("post_players_id_tasks_slots_slot_steps", ...args),
		put_players_id_tasks_slots_slot_alias: (...args) => client.request("put_players_id_tasks_slots_slot_alias", ...args),
		post_players_id_tasks_runtime_actions: (...args) => client.request("post_players_id_tasks_runtime_actions", ...args),
		get_players_id_tasks: (...args) => client.request("get_players_id_tasks", ...args),
		get_players_id_tasks_limits: (...args) => client.request("get_players_id_tasks_limits", ...args),
		put_players_id_tasks: (...args) => client.request("put_players_id_tasks", ...args),
		get_players_id_tasks_runtime: (...args) => client.request("get_players_id_tasks_runtime", ...args),
		put_players_id_tasks_runtime: (...args) => client.request("put_players_id_tasks_runtime", ...args),
		delete_players_id_tasks_runtime: (...args) => client.request("delete_players_id_tasks_runtime", ...args)
	};
}

//#endregion
export { createCrossPlatformApi, crossPlatformOperationDefinitions };