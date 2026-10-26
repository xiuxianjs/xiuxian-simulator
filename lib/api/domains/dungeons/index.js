import { dungeonsOperationDefinitions } from "./operations.js";

//#region src/api/domains/dungeons/index.ts
function createDungeonsApi(client) {
	return {
		post_players_id_spar_command: (...args) => client.request("post_players_id_spar_command", ...args),
		post_players_id_storyline_challenge_command: (...args) => client.request("post_players_id_storyline_challenge_command", ...args),
		post_players_id_battle_sessions: (...args) => client.request("post_players_id_battle_sessions", ...args),
		post_players_id_battle_sessions_sessionId_choice: (...args) => client.request("post_players_id_battle_sessions_sessionId_choice", ...args),
		get_players_id_battle_sessions_sessionId_replay: (...args) => client.request("get_players_id_battle_sessions_sessionId_replay", ...args),
		get_players_id_storyline_catalog: (...args) => client.request("get_players_id_storyline_catalog", ...args),
		get_players_id_world_boss_rewards_preview: (...args) => client.request("get_players_id_world_boss_rewards_preview", ...args),
		get_players_id_dungeons_detail: (...args) => client.request("get_players_id_dungeons_detail", ...args),
		get_players_id_dungeons_catalog: (...args) => client.request("get_players_id_dungeons_catalog", ...args),
		get_dungeons: (...args) => {
			return client.request("get_dungeons", ...args);
		},
		post_players_id_dungeons_sweep: (...args) => client.request("post_players_id_dungeons_sweep", ...args),
		post_players_id_dungeons_sweep_free: (...args) => client.request("post_players_id_dungeons_sweep_free", ...args),
		post_players_id_dungeons_dungeonId_challenge: (...args) => {
			return client.request("post_players_id_dungeons_dungeonId_challenge", ...args);
		},
		get_players_id_tower: (...args) => {
			return client.request("get_players_id_tower", ...args);
		},
		post_players_id_tower_start: (...args) => {
			return client.request("post_players_id_tower_start", ...args);
		},
		post_players_id_tower_challenge: (...args) => {
			return client.request("post_players_id_tower_challenge", ...args);
		},
		post_players_id_tower_buffs: (...args) => {
			return client.request("post_players_id_tower_buffs", ...args);
		},
		post_players_id_tower_reset: (...args) => {
			return client.request("post_players_id_tower_reset", ...args);
		},
		post_players_id_tower_sweep: (...args) => {
			return client.request("post_players_id_tower_sweep", ...args);
		},
		get_world_bosses: (...args) => {
			return client.request("get_world_bosses", ...args);
		},
		post_players_id_scarecrow_challenge: (...args) => {
			return client.request("post_players_id_scarecrow_challenge", ...args);
		},
		post_players_id_world_boss_challenge: (...args) => {
			return client.request("post_players_id_world_boss_challenge", ...args);
		},
		post_players_id_world_boss_challenge_all: (...args) => {
			return client.request("post_players_id_world_boss_challenge_all", ...args);
		},
		post_players_id_world_boss_rewards_claim: (...args) => {
			return client.request("post_players_id_world_boss_rewards_claim", ...args);
		},
		post_players_id_world_boss_rewards_claim_all: (...args) => {
			return client.request("post_players_id_world_boss_rewards_claim_all", ...args);
		},
		get_storyline_stages: (...args) => {
			return client.request("get_storyline_stages", ...args);
		},
		post_players_id_storyline_sweep: (...args) => client.request("post_players_id_storyline_sweep", ...args),
		post_players_id_storyline_stages_stageId_challenge: (...args) => {
			return client.request("post_players_id_storyline_stages_stageId_challenge", ...args);
		},
		post_players_id_storyline_manual_battles: (...args) => client.request("post_players_id_storyline_manual_battles", ...args),
		post_players_id_storyline_manual_battles_sessionId_choices: (...args) => client.request("post_players_id_storyline_manual_battles_sessionId_choices", ...args),
		get_players_id_storyline_manual_battles_sessionId: (...args) => client.request("get_players_id_storyline_manual_battles_sessionId", ...args),
		post_players_id_storyline_chapters_chapterNumber_chests_chestIndex_claim: (...args) => {
			return client.request("post_players_id_storyline_chapters_chapterNumber_chests_chestIndex_claim", ...args);
		},
		post_players_id_storyline_chapters_chapterNumber_chests_claim_all: (...args) => {
			return client.request("post_players_id_storyline_chapters_chapterNumber_chests_claim_all", ...args);
		},
		post_players_id_storyline_chests_claim_all: (...args) => {
			return client.request("post_players_id_storyline_chests_claim_all", ...args);
		}
	};
}

//#endregion
export { createDungeonsApi, dungeonsOperationDefinitions };