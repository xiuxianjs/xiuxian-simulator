// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { RankingsOperations } from './types.js';
export { rankingsOperationDefinitions } from './operations.js';

export function createRankingsApi(client: APIClient) {
  return {
    get_players_id_realm_region_leaderboard: (...args: RequestArguments<'get_players_id_realm_region_leaderboard'>) => {
      return client.request('get_players_id_realm_region_leaderboard', ...args);
    },
    get_players_id_realm_leaderboard: (...args: RequestArguments<'get_players_id_realm_leaderboard'>) => {
      return client.request('get_players_id_realm_leaderboard', ...args);
    },
    get_players_id_popularity_leaderboard: (...args: RequestArguments<'get_players_id_popularity_leaderboard'>) => {
      return client.request('get_players_id_popularity_leaderboard', ...args);
    },
    get_players_id_tower_leaderboard: (...args: RequestArguments<'get_players_id_tower_leaderboard'>) => {
      return client.request('get_players_id_tower_leaderboard', ...args);
    },
    get_players_id_storyline_leaderboard: (...args: RequestArguments<'get_players_id_storyline_leaderboard'>) => {
      return client.request('get_players_id_storyline_leaderboard', ...args);
    },
    get_leaderboards: (...args: RequestArguments<'get_leaderboards'>) => {
      return client.request('get_leaderboards', ...args);
    },
    get_leaderboards_demon_tower: (...args: RequestArguments<'get_leaderboards_demon_tower'>) => {
      return client.request('get_leaderboards_demon_tower', ...args);
    },
    get_leaderboards_battle: (...args: RequestArguments<'get_leaderboards_battle'>) => {
      return client.request('get_leaderboards_battle', ...args);
    },
    get_players_id_leaderboards_battle: (...args: RequestArguments<'get_players_id_leaderboards_battle'>) => {
      return client.request('get_players_id_leaderboards_battle', ...args);
    },
    get_players_id_leaderboards_battle_region: (...args: RequestArguments<'get_players_id_leaderboards_battle_region'>) => {
      return client.request('get_players_id_leaderboards_battle_region', ...args);
    },
    get_players_id_leaderboards_world_boss: (...args: RequestArguments<'get_players_id_leaderboards_world_boss'>) => {
      return client.request('get_players_id_leaderboards_world_boss', ...args);
    },
    get_players_id_tower_rank_rewards_first: (...args: RequestArguments<'get_players_id_tower_rank_rewards_first'>) => {
      return client.request('get_players_id_tower_rank_rewards_first', ...args);
    },
    get_players_id_tower_rank_rewards: (...args: RequestArguments<'get_players_id_tower_rank_rewards'>) => {
      return client.request('get_players_id_tower_rank_rewards', ...args);
    },
    get_players_id_tower_rank_rewards_monthly: (...args: RequestArguments<'get_players_id_tower_rank_rewards_monthly'>) => {
      return client.request('get_players_id_tower_rank_rewards_monthly', ...args);
    },
    post_players_id_tower_rank_rewards_first_ranking_claim: (...args: RequestArguments<'post_players_id_tower_rank_rewards_first_ranking_claim'>) => {
      return client.request('post_players_id_tower_rank_rewards_first_ranking_claim', ...args);
    },
    post_players_id_tower_rank_rewards_first_claim_all: (...args: RequestArguments<'post_players_id_tower_rank_rewards_first_claim_all'>) => {
      return client.request('post_players_id_tower_rank_rewards_first_claim_all', ...args);
    },
    post_players_id_tower_rank_rewards_monthly_claim: (...args: RequestArguments<'post_players_id_tower_rank_rewards_monthly_claim'>) => {
      return client.request('post_players_id_tower_rank_rewards_monthly_claim', ...args);
    },
    get_leaderboards_realm: (...args: RequestArguments<'get_leaderboards_realm'>) => {
      return client.request('get_leaderboards_realm', ...args);
    },
    get_players_id_leaderboards_realm_region: (...args: RequestArguments<'get_players_id_leaderboards_realm_region'>) => {
      return client.request('get_players_id_leaderboards_realm_region', ...args);
    },
    get_leaderboards_storyline: (...args: RequestArguments<'get_leaderboards_storyline'>) => {
      return client.request('get_leaderboards_storyline', ...args);
    }
  };
}
