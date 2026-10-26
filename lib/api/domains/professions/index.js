import { professionsOperationDefinitions } from "./operations.js";

//#region src/api/domains/professions/index.ts
function createProfessionsApi(client) {
	return {
		post_players_id_professions_lingzhi_guide_continue_current: (...args) => client.request("post_players_id_professions_lingzhi_guide_continue_current", ...args),
		get_players_id_profession_tools_bag: (...args) => client.request("get_players_id_profession_tools_bag", ...args),
		get_players_id_professions: (...args) => {
			return client.request("get_players_id_professions", ...args);
		},
		get_profession_catalog: (...args) => {
			return client.request("get_profession_catalog", ...args);
		},
		get_profession_catalog_by_code_code: (...args) => {
			return client.request("get_profession_catalog_by_code_code", ...args);
		},
		get_profession_catalog_id: (...args) => {
			return client.request("get_profession_catalog_id", ...args);
		},
		get_profession_levels: (...args) => {
			return client.request("get_profession_levels", ...args);
		},
		get_players_id_professions_summary: (...args) => {
			return client.request("get_players_id_professions_summary", ...args);
		},
		get_profession_tools: (...args) => {
			return client.request("get_profession_tools", ...args);
		},
		get_profession_tool_types: (...args) => {
			return client.request("get_profession_tool_types", ...args);
		},
		get_players_id_profession_tools: (...args) => {
			return client.request("get_players_id_profession_tools", ...args);
		},
		post_players_id_profession_tools_replace: (...args) => {
			return client.request("post_players_id_profession_tools_replace", ...args);
		}
	};
}

//#endregion
export { createProfessionsApi, professionsOperationDefinitions };