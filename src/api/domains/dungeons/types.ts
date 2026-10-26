import type { StorylineCatalogQueryData } from '../../schemas/storyline-catalog-query';
import type { WorldBossRewardsPreviewData } from '../../schemas/world-boss-rewards-query';
import type { DungeonCatalogData, DungeonDetailData } from '../../schemas/queries';
import type { DemonTowerChallengeResult } from '../../schemas/demon-tower-challenge';
import type { DemonTowerBuffSelectionResult } from '../../schemas/demon-tower-buff';
import type { DemonTowerInfoQueryData } from '../../schemas/demon-tower-info-query';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface DungeonsOperations {
  post_players_id_spar_command: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { targetUid?: number; targetBid?: string };
    response: unknown;
  };
  post_players_id_storyline_challenge_command: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key': string };
    body: { chapterNumber: number; stageNumber: number };
    response: unknown;
  };
  post_players_id_battle_sessions: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string };
    body: { id: string; unitId?: string; side?: string; availableSkills?: string[] };
    response: unknown;
  };
  post_players_id_battle_sessions_sessionId_choice: {
    path: { id: number; sessionId: string };
    query: never;
    headers: never;
    body: { choice: string };
    response: { choice: string };
  };
  get_players_id_battle_sessions_sessionId_replay: {
    path: { id: number; sessionId: string };
    query: never;
    headers: never;
    body: never;
    response: { events: unknown[] | null };
  };
  get_players_id_storyline_catalog: {
    path: { id: number };
    query: { page?: number; chapterNumber?: number };
    headers: never;
    body: never;
    response: StorylineCatalogQueryData;
  };
  get_players_id_world_boss_rewards_preview: { path: { id: number }; query: never; headers: never; body: never; response: WorldBossRewardsPreviewData };
  get_players_id_dungeons_detail: {
    path: { id: number };
    query: { name: string };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: DungeonDetailData;
  };
  get_players_id_dungeons_catalog: {
    path: { id: number };
    query: { page?: number; pageSize?: number };
    headers: never;
    body: never;
    response: DungeonCatalogData;
  };
  get_dungeons: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_dungeons_sweep: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { dungeonName: string; times: number; freeOnly?: boolean };
    response: unknown;
  };
  post_players_id_dungeons_sweep_free: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_dungeons_challenge: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { dungeonName: string; seed?: number };
    response: unknown;
  };
  post_players_id_dungeons_dungeonId_challenge: {
    path: { id: number; dungeonId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { seed?: number };
    response: unknown;
  };
  get_players_id_tower: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: DemonTowerInfoQueryData };
  post_players_id_tower_start: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_tower_challenge: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { stars: number; seed?: number };
    response: DemonTowerChallengeResult;
  };
  post_players_id_tower_buffs: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { buffKey: string; count?: number };
    response: DemonTowerBuffSelectionResult;
  };
  post_players_id_tower_reset: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_tower_sweep: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_world_bosses: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_scarecrow_challenge: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { rounds?: number; roundsText?: string; seed?: number };
    response: unknown;
  };
  post_players_id_world_boss_challenge: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { seed?: number };
    response: unknown;
  };
  post_players_id_world_boss_challenge_all: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { seed?: number };
    response: unknown;
  };
  post_players_id_world_boss_rewards_claim: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { bossDate: string; stageLevel: number };
    response: unknown;
  };
  post_players_id_world_boss_rewards_claim_all: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_storyline_stages: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_storyline_sweep: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { chapterNumber: number; stageNumber: number; times: number };
    response: unknown;
  };
  post_players_id_storyline_stages_stageId_challenge: {
    path: { id: number; stageId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Replay-Seed'?: number; 'X-Replay-Time'?: string; 'X-Request-ID'?: string };
    body: { seed?: number; teamId?: number };
    response: unknown;
  };
  post_players_id_storyline_chapters_chapterNumber_chests_chestIndex_claim: {
    path: { id: number; chapterNumber: number; chestIndex: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_storyline_chapters_chapterNumber_chests_claim_all: {
    path: { id: number; chapterNumber: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_storyline_chests_claim_all: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_storyline_manual_battles: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: { stageId: number; teamId?: number; seed?: number };
    response: unknown;
  };
  post_players_id_storyline_manual_battles_sessionId_choices: {
    path: { id: number; sessionId: string };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: { choice: string };
    response: unknown;
  };
  get_players_id_storyline_manual_battles_sessionId: {
    path: { id: number; sessionId: string };
    query: never;
    headers: never;
    body: never;
    response: unknown;
  };
}
