import { battleOperationDefinitions } from "./operations.js";

//#region src/api/domains/battle/index.ts
function createBattleApi(client) {
	return {
		post_players_id_battle_log_query: (...args) => client.request("post_players_id_battle_log_query", ...args),
		post_players_id_robbery_records_view: (...args) => client.request("post_players_id_robbery_records_view", ...args),
		get_battle_logs: (...args) => client.request("get_battle_logs", ...args),
		get_battle_memory_by_id: (...args) => client.request("get_battle_memory_by_id", ...args),
		get_players_id_kill_god_ranking: (...args) => {
			return client.request("get_players_id_kill_god_ranking", ...args);
		},
		post_players_id_kill_god_title_claim: (...args) => {
			return client.request("post_players_id_kill_god_title_claim", ...args);
		},
		get_players_id_sha_qi: (...args) => {
			return client.request("get_players_id_sha_qi", ...args);
		},
		get_players_id_alchemy_leaderboard: (...args) => {
			return client.request("get_players_id_alchemy_leaderboard", ...args);
		},
		get_players_id_robbery_enemies: (...args) => client.request("get_players_id_robbery_enemies", ...args),
		get_alchemy_leaderboard: (...args) => {
			return client.request("get_alchemy_leaderboard", ...args);
		},
		post_spar_playerId_targetId: (...args) => {
			return client.request("post_spar_playerId_targetId", ...args);
		},
		post_robbery_playerId_targetId: (...args) => {
			return client.request("post_robbery_playerId_targetId", ...args);
		},
		get_robbery_records_playerId: (...args) => {
			return client.request("get_robbery_records_playerId", ...args);
		},
		post_players_id_robbery_notifications_read: (...args) => {
			return client.request("post_players_id_robbery_notifications_read", ...args);
		},
		get_leaderboards_popularity: (...args) => {
			return client.request("get_leaderboards_popularity", ...args);
		},
		post_players_id_popularity_likes: (...args) => {
			return client.request("post_players_id_popularity_likes", ...args);
		},
		get_players_id_tianjiao: (...args) => {
			return client.request("get_players_id_tianjiao", ...args);
		},
		get_players_id_tianjiao_access: (...args) => {
			return client.request("get_players_id_tianjiao_access", ...args);
		},
		get_players_id_tianjiao_rewards: (...args) => {
			return client.request("get_players_id_tianjiao_rewards", ...args);
		},
		post_players_id_tianjiao_challenges: (...args) => {
			return client.request("post_players_id_tianjiao_challenges", ...args);
		},
		post_counter_attacks_playerId_robberyLogId: (...args) => {
			return client.request("post_counter_attacks_playerId_robberyLogId", ...args);
		}
	};
}

//#endregion
export { battleOperationDefinitions, createBattleApi };