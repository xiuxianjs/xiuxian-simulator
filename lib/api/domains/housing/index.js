import { housingOperationDefinitions } from "./operations.js";

//#region src/api/domains/housing/index.ts
function createHousingApi(client) {
	return {
		post_players_id_cave_command: (...args) => client.request("post_players_id_cave_command", ...args),
		get_players_id_cave_plant_query: (...args) => client.request("get_players_id_cave_plant_query", ...args),
		get_players_id_cave_view: (...args) => client.request("get_players_id_cave_view", ...args),
		get_players_id_professions_lingzhi_guide: (...args) => {
			return client.request("get_players_id_professions_lingzhi_guide", ...args);
		},
		post_players_id_professions_lingzhi_guide_start: (...args) => {
			return client.request("post_players_id_professions_lingzhi_guide_start", ...args);
		},
		post_players_id_professions_lingzhi_guide_continue: (...args) => {
			return client.request("post_players_id_professions_lingzhi_guide_continue", ...args);
		},
		get_players_id_professions_lingzhi_guide_start_facts: (...args) => {
			return client.request("get_players_id_professions_lingzhi_guide_start_facts", ...args);
		},
		post_players_id_professions_lingzhi_activate: (...args) => {
			return client.request("post_players_id_professions_lingzhi_activate", ...args);
		},
		get_players_id_cave_access: (...args) => {
			return client.request("get_players_id_cave_access", ...args);
		},
		get_players_id_cave: (...args) => {
			return client.request("get_players_id_cave", ...args);
		},
		get_players_id_cave_plant_options: (...args) => {
			return client.request("get_players_id_cave_plant_options", ...args);
		},
		get_players_id_cave_formations: (...args) => {
			return client.request("get_players_id_cave_formations", ...args);
		},
		post_players_id_cave_formations_activate: (...args) => {
			return client.request("post_players_id_cave_formations_activate", ...args);
		},
		delete_players_id_cave_formations_category: (...args) => {
			return client.request("delete_players_id_cave_formations_category", ...args);
		},
		post_players_id_cave_plots_plant: (...args) => {
			return client.request("post_players_id_cave_plots_plant", ...args);
		},
		post_players_id_cave_plots_care: (...args) => {
			return client.request("post_players_id_cave_plots_care", ...args);
		},
		post_players_id_cave_plots_harvest: (...args) => {
			return client.request("post_players_id_cave_plots_harvest", ...args);
		},
		post_players_id_cave_plots_accelerate: (...args) => {
			return client.request("post_players_id_cave_plots_accelerate", ...args);
		},
		get_players_id_cave_logs: (...args) => {
			return client.request("get_players_id_cave_logs", ...args);
		},
		get_players_id_cave_visit_ownerId: (...args) => {
			return client.request("get_players_id_cave_visit_ownerId", ...args);
		},
		get_players_id_cave_nearby: (...args) => {
			return client.request("get_players_id_cave_nearby", ...args);
		},
		post_players_id_cave_plots_cultivate: (...args) => {
			return client.request("post_players_id_cave_plots_cultivate", ...args);
		},
		post_players_id_cave_plots_upgrade: (...args) => {
			return client.request("post_players_id_cave_plots_upgrade", ...args);
		},
		post_players_id_cave_collaborations: (...args) => {
			return client.request("post_players_id_cave_collaborations", ...args);
		},
		post_players_id_cave_steals: (...args) => {
			return client.request("post_players_id_cave_steals", ...args);
		}
	};
}

//#endregion
export { createHousingApi, housingOperationDefinitions };