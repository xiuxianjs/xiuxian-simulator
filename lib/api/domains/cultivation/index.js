import { cultivationOperationDefinitions } from "./operations.js";

//#region src/api/domains/cultivation/index.ts
function createCultivationApi(client) {
	return {
		post_players_id_seclusion_command: (...args) => client.request("post_players_id_seclusion_command", ...args),
		post_players_id_tribulation_events_eventId_confirmation_query: (...args) => client.request("post_players_id_tribulation_events_eventId_confirmation_query", ...args),
		post_players_id_realm_promotion_command: (...args) => client.request("post_players_id_realm_promotion_command", ...args),
		get_tribulation_events: (...args) => client.request("get_tribulation_events", ...args),
		get_tribulation_events_eventId: (...args) => client.request("get_tribulation_events_eventId", ...args),
		post_players_id_tribulation_events_eventId_confirmation: (...args) => client.request("post_players_id_tribulation_events_eventId_confirmation", ...args),
		post_players_id_tribulation_events_eventId_open: (...args) => client.request("post_players_id_tribulation_events_eventId_open", ...args),
		post_players_id_tribulation_events_eventId_start: (...args) => client.request("post_players_id_tribulation_events_eventId_start", ...args),
		get_players_id_tribulation_events_eventId_result: (...args) => client.request("get_players_id_tribulation_events_eventId_result", ...args),
		post_players_id_entry: (...args) => {
			return client.request("post_players_id_entry", ...args);
		},
		post_players_id_resources_settle: (...args) => {
			return client.request("post_players_id_resources_settle", ...args);
		},
		get_players_id_mental: (...args) => {
			return client.request("get_players_id_mental", ...args);
		},
		get_players_id_meditation_active: (...args) => {
			return client.request("get_players_id_meditation_active", ...args);
		},
		get_players_id_meditation_progress: (...args) => client.request("get_players_id_meditation_progress", ...args),
		post_players_id_meditation_guard: (...args) => {
			return client.request("post_players_id_meditation_guard", ...args);
		},
		post_players_id_meditation_start: (...args) => {
			return client.request("post_players_id_meditation_start", ...args);
		},
		post_players_id_meditation_settle: (...args) => {
			return client.request("post_players_id_meditation_settle", ...args);
		},
		get_players_id_realm_breakthrough: (...args) => {
			return client.request("get_players_id_realm_breakthrough", ...args);
		},
		post_players_id_realm_breakthrough: (...args) => {
			return client.request("post_players_id_realm_breakthrough", ...args);
		},
		get_players_id_realm_promotion: (...args) => {
			return client.request("get_players_id_realm_promotion", ...args);
		},
		post_players_id_realm_promotion: (...args) => {
			return client.request("post_players_id_realm_promotion", ...args);
		},
		get_players_id_realm_tribulation_preview: (...args) => {
			return client.request("get_players_id_realm_tribulation_preview", ...args);
		},
		get_players_id_meridians: (...args) => {
			return client.request("get_players_id_meridians", ...args);
		},
		post_players_id_meridians_pulse: (...args) => {
			return client.request("post_players_id_meridians_pulse", ...args);
		},
		get_players_id_seclusion: (...args) => {
			return client.request("get_players_id_seclusion", ...args);
		},
		post_players_id_seclusion_guard: (...args) => {
			return client.request("post_players_id_seclusion_guard", ...args);
		},
		get_players_id_seclusion_selection: (...args) => {
			return client.request("get_players_id_seclusion_selection", ...args);
		},
		get_players_id_seclusion_preview: (...args) => {
			return client.request("get_players_id_seclusion_preview", ...args);
		},
		post_players_id_seclusion_start: (...args) => {
			return client.request("post_players_id_seclusion_start", ...args);
		},
		post_players_id_seclusion_start_by_name: (...args) => {
			return client.request("post_players_id_seclusion_start_by_name", ...args);
		},
		post_players_id_seclusion_end: (...args) => {
			return client.request("post_players_id_seclusion_end", ...args);
		},
		get_players_id_soul_path: (...args) => {
			return client.request("get_players_id_soul_path", ...args);
		},
		post_players_id_soul_path_choose: (...args) => {
			return client.request("post_players_id_soul_path_choose", ...args);
		},
		post_players_id_soul_path_switch: (...args) => {
			return client.request("post_players_id_soul_path_switch", ...args);
		},
		post_players_id_soul_path_advance: (...args) => {
			return client.request("post_players_id_soul_path_advance", ...args);
		},
		post_players_id_soul_path_nurture: (...args) => {
			return client.request("post_players_id_soul_path_nurture", ...args);
		},
		post_players_id_soul_path_reroll: (...args) => {
			return client.request("post_players_id_soul_path_reroll", ...args);
		},
		put_players_id_soul_path_supply_direction: (...args) => {
			return client.request("put_players_id_soul_path_supply_direction", ...args);
		},
		post_players_id_green_bottle_convert: (...args) => {
			return client.request("post_players_id_green_bottle_convert", ...args);
		},
		post_players_id_peiyuan_dan_use: (...args) => {
			return client.request("post_players_id_peiyuan_dan_use", ...args);
		},
		post_players_id_peiyuan_dan_confirm: (...args) => {
			return client.request("post_players_id_peiyuan_dan_confirm", ...args);
		},
		post_players_id_peiyuan_dan_cancel: (...args) => {
			return client.request("post_players_id_peiyuan_dan_cancel", ...args);
		},
		get_players_id_green_bottle: (...args) => {
			return client.request("get_players_id_green_bottle", ...args);
		}
	};
}

//#endregion
export { createCultivationApi, cultivationOperationDefinitions };