import type { TowerRewardOverviewQueryData } from '../../schemas/tower-reward-overview-query';
import type { TowerFirstRewardsQueryData, TowerMonthlyRewardsQueryData } from '../../schemas/tower-rewards-query';
import type { WorldBossRankingQuery } from '../../schemas/world-boss-ranking-query';
import type { RealmRankingQueryData } from '../../schemas/realm-ranking-query';
import type { PopularityQueryPage } from '../../schemas/popularity-query';
import type { TowerRankingQueryData } from '../../schemas/tower-ranking-query';
import type { StorylineRankingQueryData } from '../../schemas/storyline-ranking-query';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface RankingsOperations {
  get_players_id_realm_region_leaderboard: { path: { id: number }; query: never; headers: never; body: never; response: RealmRankingQueryData };
  get_players_id_realm_leaderboard: { path: { id: number }; query: never; headers: never; body: never; response: RealmRankingQueryData };
  get_players_id_popularity_leaderboard: { path: { id: number }; query: never; headers: never; body: never; response: PopularityQueryPage };
  get_players_id_tower_leaderboard: { path: { id: number }; query: { page?: number }; headers: never; body: never; response: TowerRankingQueryData };
  get_players_id_storyline_leaderboard: {
    path: { id: number };
    query: { cursor?: string; page?: number };
    headers: never;
    body: never;
    response: StorylineRankingQueryData;
  };
  get_leaderboards: { path: never; query: never; headers: never; body: never; response: unknown };
  get_leaderboards_demon_tower: { path: never; query: { page?: number }; headers: never; body: never; response: unknown };
  get_leaderboards_battle: { path: never; query: { page?: number }; headers: never; body: never; response: unknown };
  get_players_id_leaderboards_battle: {
    path: { id: number };
    query: { page?: number };
    headers: never;
    body: never;
    response: import('../../schemas/battle-leaderboard-query').BattleLeaderboardQueryData;
  };
  get_players_id_leaderboards_battle_region: { path: { id: number }; query: { page?: number }; headers: never; body: never; response: unknown };
  get_players_id_leaderboards_world_boss: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: WorldBossRankingQuery;
  };
  get_players_id_tower_rank_rewards_first: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: TowerFirstRewardsQueryData;
  };
  get_players_id_tower_rank_rewards: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: TowerRewardOverviewQueryData;
  };
  get_players_id_tower_rank_rewards_monthly: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: TowerMonthlyRewardsQueryData;
  };
  post_players_id_tower_rank_rewards_first_ranking_claim: {
    path: { id: number; ranking: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_tower_rank_rewards_first_claim_all: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Repeat-Command'?: string };
    body: never;
    response: { claimedCount: number; rewardTexts: string[] };
  };
  post_players_id_tower_rank_rewards_monthly_claim: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { rewardId?: number };
    response: unknown;
  };
  get_players_id_tongtian_tower: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_tongtian_tower_challenges: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { targetRank: number; seed?: number };
    response: unknown;
  };
  post_players_id_tongtian_tower_sweeps: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { targetRank: number; count: number };
    response: unknown;
  };
  post_players_id_tongtian_tower_batch_challenges: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { seed?: number };
    response: unknown;
  };
  get_leaderboards_realm: { path: never; query: { limit?: number }; headers: never; body: never; response: unknown };
  get_players_id_leaderboards_realm_region: { path: { id: number }; query: { limit?: number }; headers: never; body: never; response: unknown };
  get_leaderboards_storyline: { path: never; query: { page?: number }; headers: never; body: never; response: unknown };
}
