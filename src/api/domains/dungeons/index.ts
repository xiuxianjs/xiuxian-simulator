// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { DungeonsOperations } from './types.js';
export { dungeonsOperationDefinitions } from './operations.js';

export function createDungeonsApi(client: APIClient) {
  return {
    post_players_id_spar_command: (...args: RequestArguments<'post_players_id_spar_command'>) => client.request('post_players_id_spar_command', ...args),
    post_players_id_storyline_challenge_command: (...args: RequestArguments<'post_players_id_storyline_challenge_command'>) => client.request('post_players_id_storyline_challenge_command', ...args),
    post_players_id_battle_sessions: (...args: RequestArguments<'post_players_id_battle_sessions'>) => client.request('post_players_id_battle_sessions', ...args),
    post_players_id_battle_sessions_sessionId_choice: (...args: RequestArguments<'post_players_id_battle_sessions_sessionId_choice'>) => client.request('post_players_id_battle_sessions_sessionId_choice', ...args),
    get_players_id_battle_sessions_sessionId_replay: (...args: RequestArguments<'get_players_id_battle_sessions_sessionId_replay'>) => client.request('get_players_id_battle_sessions_sessionId_replay', ...args),
    get_players_id_storyline_catalog: (...args: RequestArguments<'get_players_id_storyline_catalog'>) => client.request('get_players_id_storyline_catalog', ...args),
    get_players_id_world_boss_rewards_preview: (...args: RequestArguments<'get_players_id_world_boss_rewards_preview'>) => client.request('get_players_id_world_boss_rewards_preview', ...args),
    get_players_id_dungeons_detail: (...args: RequestArguments<'get_players_id_dungeons_detail'>) => client.request('get_players_id_dungeons_detail', ...args),
    get_players_id_dungeons_catalog: (...args: RequestArguments<'get_players_id_dungeons_catalog'>) => client.request('get_players_id_dungeons_catalog', ...args),
    get_dungeons: (...args: RequestArguments<'get_dungeons'>) => {
      return client.request('get_dungeons', ...args);
    },
    post_players_id_dungeons_sweep: (...args: RequestArguments<'post_players_id_dungeons_sweep'>) => client.request('post_players_id_dungeons_sweep', ...args),
    post_players_id_dungeons_sweep_free: (...args: RequestArguments<'post_players_id_dungeons_sweep_free'>) => client.request('post_players_id_dungeons_sweep_free', ...args),
    post_players_id_dungeons_dungeonId_challenge: (...args: RequestArguments<'post_players_id_dungeons_dungeonId_challenge'>) => {
      return client.request('post_players_id_dungeons_dungeonId_challenge', ...args);
    },
    get_players_id_tower: (...args: RequestArguments<'get_players_id_tower'>) => {
      return client.request('get_players_id_tower', ...args);
    },
    post_players_id_tower_start: (...args: RequestArguments<'post_players_id_tower_start'>) => {
      return client.request('post_players_id_tower_start', ...args);
    },
    post_players_id_tower_challenge: (...args: RequestArguments<'post_players_id_tower_challenge'>) => {
      return client.request('post_players_id_tower_challenge', ...args);
    },
    post_players_id_tower_buffs: (...args: RequestArguments<'post_players_id_tower_buffs'>) => {
      return client.request('post_players_id_tower_buffs', ...args);
    },
    post_players_id_tower_reset: (...args: RequestArguments<'post_players_id_tower_reset'>) => {
      return client.request('post_players_id_tower_reset', ...args);
    },
    post_players_id_tower_sweep: (...args: RequestArguments<'post_players_id_tower_sweep'>) => {
      return client.request('post_players_id_tower_sweep', ...args);
    },
    get_world_bosses: (...args: RequestArguments<'get_world_bosses'>) => {
      return client.request('get_world_bosses', ...args);
    },
    post_players_id_scarecrow_challenge: (...args: RequestArguments<'post_players_id_scarecrow_challenge'>) => {
      return client.request('post_players_id_scarecrow_challenge', ...args);
    },
    post_players_id_world_boss_challenge: (...args: RequestArguments<'post_players_id_world_boss_challenge'>) => {
      return client.request('post_players_id_world_boss_challenge', ...args);
    },
    post_players_id_world_boss_challenge_all: (...args: RequestArguments<'post_players_id_world_boss_challenge_all'>) => {
      return client.request('post_players_id_world_boss_challenge_all', ...args);
    },
    post_players_id_world_boss_rewards_claim: (...args: RequestArguments<'post_players_id_world_boss_rewards_claim'>) => {
      return client.request('post_players_id_world_boss_rewards_claim', ...args);
    },
    post_players_id_world_boss_rewards_claim_all: (...args: RequestArguments<'post_players_id_world_boss_rewards_claim_all'>) => {
      return client.request('post_players_id_world_boss_rewards_claim_all', ...args);
    },
    get_storyline_stages: (...args: RequestArguments<'get_storyline_stages'>) => {
      return client.request('get_storyline_stages', ...args);
    },
    post_players_id_storyline_sweep: (...args: RequestArguments<'post_players_id_storyline_sweep'>) => client.request('post_players_id_storyline_sweep', ...args),
    post_players_id_storyline_stages_stageId_challenge: (...args: RequestArguments<'post_players_id_storyline_stages_stageId_challenge'>) => {
      return client.request('post_players_id_storyline_stages_stageId_challenge', ...args);
    },
    post_players_id_storyline_manual_battles: (...args: RequestArguments<'post_players_id_storyline_manual_battles'>) => client.request('post_players_id_storyline_manual_battles', ...args),
    post_players_id_storyline_manual_battles_sessionId_choices: (...args: RequestArguments<'post_players_id_storyline_manual_battles_sessionId_choices'>) => client.request('post_players_id_storyline_manual_battles_sessionId_choices', ...args),
    get_players_id_storyline_manual_battles_sessionId: (...args: RequestArguments<'get_players_id_storyline_manual_battles_sessionId'>) => client.request('get_players_id_storyline_manual_battles_sessionId', ...args),
    post_players_id_storyline_chapters_chapterNumber_chests_chestIndex_claim: (
      ...args: RequestArguments<'post_players_id_storyline_chapters_chapterNumber_chests_chestIndex_claim'>
    ) => {
      return client.request('post_players_id_storyline_chapters_chapterNumber_chests_chestIndex_claim', ...args);
    },
    post_players_id_storyline_chapters_chapterNumber_chests_claim_all: (
      ...args: RequestArguments<'post_players_id_storyline_chapters_chapterNumber_chests_claim_all'>
    ) => {
      return client.request('post_players_id_storyline_chapters_chapterNumber_chests_claim_all', ...args);
    },
    post_players_id_storyline_chests_claim_all: (...args: RequestArguments<'post_players_id_storyline_chests_claim_all'>) => {
      return client.request('post_players_id_storyline_chests_claim_all', ...args);
    }
  };
}
