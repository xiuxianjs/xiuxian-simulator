import { sectsOperationDefinitions } from "./operations.js";

//#region src/api/domains/sects/index.ts
function createSectsApi(client) {
	return {
		post_players_id_guild_workflow: (...args) => client.request("post_players_id_guild_workflow", ...args),
		get_players_id_guild_battle_training: (...args) => client.request("get_players_id_guild_battle_training", ...args),
		post_players_id_guild_battle_training: (...args) => client.request("post_players_id_guild_battle_training", ...args),
		delete_players_id_guild_leave_confirmation: (...args) => client.request("delete_players_id_guild_leave_confirmation", ...args),
		get_players_id_guild_realm_options: (...args) => client.request("get_players_id_guild_realm_options", ...args),
		get_players_id_guild_home: (...args) => client.request("get_players_id_guild_home", ...args),
		patch_players_id_guild_min_realm: (...args) => client.request("patch_players_id_guild_min_realm", ...args),
		post_players_id_guild_rename: (...args) => client.request("post_players_id_guild_rename", ...args),
		patch_players_id_guild_content: (...args) => client.request("patch_players_id_guild_content", ...args),
		get_players_id_guild_essences: (...args) => client.request("get_players_id_guild_essences", ...args),
		post_players_id_guild_activity: (...args) => client.request("post_players_id_guild_activity", ...args),
		get_players_id_guild_content: (...args) => client.request("get_players_id_guild_content", ...args),
		get_players_id_guild_role_options: (...args) => {
			return client.request("get_players_id_guild_role_options", ...args);
		},
		get_players_id_guild_review_applications: (...args) => client.request("get_players_id_guild_review_applications", ...args),
		get_players_id_guild_members: (...args) => client.request("get_players_id_guild_members", ...args),
		get_players_id_guild_logs: (...args) => client.request("get_players_id_guild_logs", ...args),
		get_guilds: (...args) => client.request("get_guilds", ...args),
		get_guilds_guildId_logs: (...args) => {
			return client.request("get_guilds_guildId_logs", ...args);
		},
		get_players_id_guild_milestones_types_type: (...args) => {
			return client.request("get_players_id_guild_milestones_types_type", ...args);
		},
		get_players_id_guild_red_packets: (...args) => {
			return client.request("get_players_id_guild_red_packets", ...args);
		},
		post_players_id_guild_red_packets: (...args) => {
			return client.request("post_players_id_guild_red_packets", ...args);
		},
		get_players_id_guild_red_packets_mine: (...args) => {
			return client.request("get_players_id_guild_red_packets_mine", ...args);
		},
		get_players_id_guild_storyline_records: (...args) => {
			return client.request("get_players_id_guild_storyline_records", ...args);
		},
		get_players_id_guild_tasks_type: (...args) => {
			return client.request("get_players_id_guild_tasks_type", ...args);
		},
		get_players_id_guild_storyline: (...args) => {
			return client.request("get_players_id_guild_storyline", ...args);
		},
		post_players_id_guild_storyline_challenge: (...args) => client.request("post_players_id_guild_storyline_challenge", ...args),
		post_players_id_guild_storyline_stages_stageIndex_claim: (...args) => {
			return client.request("post_players_id_guild_storyline_stages_stageIndex_claim", ...args);
		},
		post_players_id_guild_red_packets_packetId_claim: (...args) => {
			return client.request("post_players_id_guild_red_packets_packetId_claim", ...args);
		},
		post_players_id_guild_red_packets_packetId_recycle: (...args) => {
			return client.request("post_players_id_guild_red_packets_packetId_recycle", ...args);
		},
		post_players_id_guild_milestones_claims_milestoneId: (...args) => {
			return client.request("post_players_id_guild_milestones_claims_milestoneId", ...args);
		},
		post_players_id_guild_milestones_types_type_claim_all: (...args) => {
			return client.request("post_players_id_guild_milestones_types_type_claim_all", ...args);
		}
	};
}

//#endregion
export { createSectsApi, sectsOperationDefinitions };