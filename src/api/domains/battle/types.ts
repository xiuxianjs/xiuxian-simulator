import type { BattleLogQueryData } from '../../schemas/battle-log-query';
import type { TianjiaoRewardsQuery } from '../../schemas/tianjiao-rewards-query';
import type { TianjiaoLeaderboardQuery } from '../../schemas/tianjiao-leaderboard-query';
import type { ShaQiQueryData, KillGodRankingQueryData } from '../../schemas/shaqi-query';
import type { AlchemyRankingQueryData } from '../../schemas/alchemy-ranking-query';
import type { RobberyEnemyData } from '../../schemas/queries';
import type { PopularityLikeResult } from '../../schemas/popularity-like';
import type { RobberyRecordPage, RobberyNotificationsReadResult } from '../../schemas/robbery-records';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface BattleOperations {
  post_players_id_battle_log_query: {
    path: { id: number };
    query: never;
    headers: { 'X-Repeat-Command'?: string };
    body: { logId: string };
    response: BattleLogQueryData;
  };
  post_players_id_robbery_records_view: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string };
    body: { page: number };
    response: RobberyRecordPage;
  };
  get_battle_logs: { path: never; query: { logId: string }; headers: never; body: never; response: BattleLogQueryData };
  get_players_id_kill_god_ranking: { path: { id: number }; query: never; headers: never; body: never; response: KillGodRankingQueryData };
  post_players_id_kill_god_title_claim: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_sha_qi: { path: { id: number }; query: never; headers: never; body: never; response: ShaQiQueryData | null };
  get_players_id_alchemy_leaderboard: {
    path: { id: number };
    query: { cursor?: string; page?: number; pageSize?: number };
    headers: never;
    body: never;
    response: AlchemyRankingQueryData;
  };
  get_players_id_robbery_enemies: { path: { id: number }; query: never; headers: never; body: never; response: RobberyEnemyData[] };
  get_alchemy_leaderboard: { path: never; query: { limit?: number }; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_spar_playerId_targetId: {
    path: { playerId: number; targetId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { seed?: number };
    response: unknown;
  };
  post_robbery_playerId_targetId: {
    path: { playerId: number; targetId: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: { counter?: boolean; logId?: number; seed?: number };
    response: unknown;
  };
  get_robbery_records_playerId: {
    path: { playerId: number };
    query: { page?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: RobberyRecordPage;
  };
  post_players_id_robbery_notifications_read: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: RobberyNotificationsReadResult;
  };
  get_leaderboards_popularity: { path: never; query: { limit?: number }; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_popularity_likes: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { boardType?: string; targetUserId: number };
    response: PopularityLikeResult;
  };
  get_players_id_tianjiao: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: TianjiaoLeaderboardQuery };
  get_players_id_tianjiao_access: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_tianjiao_rewards: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: TianjiaoRewardsQuery };
  post_players_id_tianjiao_challenges: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { seed?: number; targetRank: number };
    response: unknown;
  };
  post_counter_attacks_playerId_robberyLogId: {
    path: { playerId: number; robberyLogId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { seed?: number };
    response: unknown;
  };
}
