import { rankingsOperationDefinitions } from "./operations.js";

//#region src/api/domains/rankings/index.ts
function createRankingsApi(client) {
	return {
		get_players_id_realm_region_leaderboard: (...args) => {
			return client.request("get_players_id_realm_region_leaderboard", ...args);
		},
		get_players_id_realm_leaderboard: (...args) => {
			return client.request("get_players_id_realm_leaderboard", ...args);
		},
		get_players_id_popularity_leaderboard: (...args) => {
			return client.request("get_players_id_popularity_leaderboard", ...args);
		},
		get_players_id_tower_leaderboard: (...args) => {
			return client.request("get_players_id_tower_leaderboard", ...args);
		},
		get_players_id_storyline_leaderboard: (...args) => {
			return client.request("get_players_id_storyline_leaderboard", ...args);
		},
		get_leaderboards: (...args) => {
			return client.request("get_leaderboards", ...args);
		},
		get_leaderboards_demon_tower: (...args) => {
			return client.request("get_leaderboards_demon_tower", ...args);
		},
		get_leaderboards_battle: (...args) => {
			return client.request("get_leaderboards_battle", ...args);
		},
		get_players_id_leaderboards_battle: (...args) => {
			return client.request("get_players_id_leaderboards_battle", ...args);
		},
		get_players_id_leaderboards_battle_region: (...args) => {
			return client.request("get_players_id_leaderboards_battle_region", ...args);
		},
		get_players_id_leaderboards_world_boss: (...args) => {
			return client.request("get_players_id_leaderboards_world_boss", ...args);
		},
		get_players_id_tower_rank_rewards_first: (...args) => {
			return client.request("get_players_id_tower_rank_rewards_first", ...args);
		},
		get_players_id_tower_rank_rewards: (...args) => {
			return client.request("get_players_id_tower_rank_rewards", ...args);
		},
		get_players_id_tower_rank_rewards_monthly: (...args) => {
			return client.request("get_players_id_tower_rank_rewards_monthly", ...args);
		},
		post_players_id_tower_rank_rewards_first_ranking_claim: (...args) => {
			return client.request("post_players_id_tower_rank_rewards_first_ranking_claim", ...args);
		},
		post_players_id_tower_rank_rewards_first_claim_all: (...args) => {
			return client.request("post_players_id_tower_rank_rewards_first_claim_all", ...args);
		},
		post_players_id_tower_rank_rewards_monthly_claim: (...args) => {
			return client.request("post_players_id_tower_rank_rewards_monthly_claim", ...args);
		},
		get_leaderboards_realm: (...args) => {
			return client.request("get_leaderboards_realm", ...args);
		},
		get_players_id_leaderboards_realm_region: (...args) => {
			return client.request("get_players_id_leaderboards_realm_region", ...args);
		},
		get_leaderboards_storyline: (...args) => {
			return client.request("get_leaderboards_storyline", ...args);
		}
	};
}

//#endregion
export { createRankingsApi, rankingsOperationDefinitions };