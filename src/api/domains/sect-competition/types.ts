import type { CurrentMonthBetsData } from '../../schemas/competition-bets-query';
import type { GuildCompetitionBattleQueryData } from '../../schemas/competition-battle-query';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface SectCompetitionOperations {
  get_players_id_guild_competition_team_candidates: {
    path: { id: number };
    query: { page?: number };
    headers: never;
    body: never;
    response: import('../../schemas/competition-member-candidates-query').GuildCompetitionMemberCandidatesData;
  };
  get_guild_competitions_current_month_bets_mine: { path: never; query: never; headers: never; body: never; response: CurrentMonthBetsData };
  get_players_id_guild_competition_battles: {
    path: { id: number };
    query: { page?: number };
    headers: never;
    body: never;
    response: GuildCompetitionBattleQueryData;
  };
  get_guild_competitions_current: { path: never; query: never; headers: never; body: never; response: unknown };
  get_guild_competitions_current_promotion_teams: { path: never; query: never; headers: never; body: never; response: unknown };
  get_players_id_guild_competition_home: { path: { id: number }; query: never; headers: never; body: never; response: unknown };
  get_players_id_guild_competition_battles_battle_id: { path: { id: number; battleId: number }; query: never; headers: never; body: never; response: unknown };
  get_guild_competitions_current_teams: { path: never; query: { page?: number; pageSize?: number }; headers: never; body: never; response: unknown };
  get_guild_competitions_current_battles: { path: never; query: { page?: number; pageSize?: number }; headers: never; body: never; response: unknown };
  get_guild_competitions_current_bets_mine: { path: never; query: { page?: number; pageSize?: number }; headers: never; body: never; response: unknown };
  get_guild_competitions_current_rewards_mine: { path: never; query: never; headers: never; body: never; response: unknown };
  post_guild_competitions_current_rewards_claim: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_competition_apply: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_competition_team_members: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { targetUserId: number; position: number };
    response: unknown;
  };
  delete_players_id_guild_competition_team_members_position: {
    path: { id: number; position: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_competition_team_position: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { fromPosition: number; toPosition: number };
    response: unknown;
  };
  delete_players_id_guild_competition_team: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_competition_bets: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { guildId: number; amount: number };
    response: unknown;
  };
  get_players_id_guild_competition_knockout_candidates: {
    path: { id: number };
    query: never;
    headers: never;
    body: never;
    response: unknown;
  };
  post_players_id_guild_competition_knockout_challenges: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { defenderGuildId: number; seed?: number };
    response: unknown;
  };
  post_players_id_guild_competition_bets_follow: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { amount: number };
    response: unknown;
  };
}
