// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { BattleOperations } from './types.js';
export { battleOperationDefinitions } from './operations.js';

export function createBattleApi(client: APIClient) {
  return {
    post_players_id_battle_log_query: (...args: RequestArguments<'post_players_id_battle_log_query'>) => client.request('post_players_id_battle_log_query', ...args),
    post_players_id_robbery_records_view: (...args: RequestArguments<'post_players_id_robbery_records_view'>) => client.request('post_players_id_robbery_records_view', ...args),
    get_battle_logs: (...args: RequestArguments<'get_battle_logs'>) => client.request('get_battle_logs', ...args),
    get_battle_memory_by_id: (...args: RequestArguments<'get_battle_memory_by_id'>) => client.request('get_battle_memory_by_id', ...args),
    get_players_id_kill_god_ranking: (...args: RequestArguments<'get_players_id_kill_god_ranking'>) => {
      return client.request('get_players_id_kill_god_ranking', ...args);
    },
    post_players_id_kill_god_title_claim: (...args: RequestArguments<'post_players_id_kill_god_title_claim'>) => {
      return client.request('post_players_id_kill_god_title_claim', ...args);
    },
    get_players_id_sha_qi: (...args: RequestArguments<'get_players_id_sha_qi'>) => {
      return client.request('get_players_id_sha_qi', ...args);
    },
    get_players_id_alchemy_leaderboard: (...args: RequestArguments<'get_players_id_alchemy_leaderboard'>) => {
      return client.request('get_players_id_alchemy_leaderboard', ...args);
    },
    get_players_id_robbery_enemies: (...args: RequestArguments<'get_players_id_robbery_enemies'>) => client.request('get_players_id_robbery_enemies', ...args),
    get_alchemy_leaderboard: (...args: RequestArguments<'get_alchemy_leaderboard'>) => {
      return client.request('get_alchemy_leaderboard', ...args);
    },
    post_spar_playerId_targetId: (...args: RequestArguments<'post_spar_playerId_targetId'>) => {
      return client.request('post_spar_playerId_targetId', ...args);
    },
    post_robbery_playerId_targetId: (...args: RequestArguments<'post_robbery_playerId_targetId'>) => {
      return client.request('post_robbery_playerId_targetId', ...args);
    },
    get_robbery_records_playerId: (...args: RequestArguments<'get_robbery_records_playerId'>) => {
      return client.request('get_robbery_records_playerId', ...args);
    },
    post_players_id_robbery_notifications_read: (...args: RequestArguments<'post_players_id_robbery_notifications_read'>) => {
      return client.request('post_players_id_robbery_notifications_read', ...args);
    },
    get_leaderboards_popularity: (...args: RequestArguments<'get_leaderboards_popularity'>) => {
      return client.request('get_leaderboards_popularity', ...args);
    },
    post_players_id_popularity_likes: (...args: RequestArguments<'post_players_id_popularity_likes'>) => {
      return client.request('post_players_id_popularity_likes', ...args);
    },
    get_players_id_tianjiao: (...args: RequestArguments<'get_players_id_tianjiao'>) => {
      return client.request('get_players_id_tianjiao', ...args);
    },
    get_players_id_tianjiao_access: (...args: RequestArguments<'get_players_id_tianjiao_access'>) => {
      return client.request('get_players_id_tianjiao_access', ...args);
    },
    get_players_id_tianjiao_rewards: (...args: RequestArguments<'get_players_id_tianjiao_rewards'>) => {
      return client.request('get_players_id_tianjiao_rewards', ...args);
    },
    post_players_id_tianjiao_challenges: (...args: RequestArguments<'post_players_id_tianjiao_challenges'>) => {
      return client.request('post_players_id_tianjiao_challenges', ...args);
    },
    post_counter_attacks_playerId_robberyLogId: (...args: RequestArguments<'post_counter_attacks_playerId_robberyLogId'>) => {
      return client.request('post_counter_attacks_playerId_robberyLogId', ...args);
    }
  };
}
