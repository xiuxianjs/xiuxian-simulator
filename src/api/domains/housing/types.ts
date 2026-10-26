import type { CaveAccessQueryData } from '../../schemas/cave-access-query';
import type { CaveFormationActivateResult, CaveFormationRemoveResult } from '../../schemas/cave-formation-action';
import type { CaveFormationQueryItem } from '../../schemas/cave-formation-query';
import type { CaveLogQueryData } from '../../schemas/cave-query';
import type { CaveOverviewQueryData } from '../../schemas/cave-overview-query';
import type { CaveCultivateResult, CavePlantResult } from '../../schemas/cave-plot-action';
import type { CaveVisitQueryData } from '../../schemas/cave-visit-query';
import type { CaveNearbyQueryData } from '../../schemas/cave-nearby-query';
import type { LingzhiActivationData } from '../../schemas/lingzhi-activation';
import type { LingzhiGuideState } from '../../schemas/lingzhi-guide';
import type { LingzhiGuideStartFacts } from '../../schemas/lingzhi-guide-start-facts';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface HousingOperations {
  post_players_id_cave_command: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: {
      action: 'cultivate' | 'plant' | 'care' | 'harvest' | 'upgrade' | 'accelerate' | 'collaborate' | 'steal';
      plotIndex?: number;
      seedName?: string;
      accelerator?: 'lingfei' | 'greenBottle' | 'spiritStone' | 'ripen';
      count?: number;
      ownerId?: number;
      ownerBid?: string;
      careAction?: 'water' | 'worm' | 'weed' | 'harvest';
    };
    response: unknown;
  };
  get_players_id_cave_plant_query: {
    path: { id: number };
    query: { plotIndex?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_cave_view: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_professions_lingzhi_guide: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: LingzhiGuideState;
  };
  post_players_id_professions_lingzhi_guide_start: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: LingzhiGuideState;
  };
  post_players_id_professions_lingzhi_guide_continue: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { expectedVersion: number };
    response: LingzhiGuideState;
  };
  get_players_id_professions_lingzhi_guide_start_facts: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: LingzhiGuideStartFacts;
  };
  post_players_id_professions_lingzhi_activate: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: LingzhiActivationData;
  };
  get_players_id_cave_access: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: CaveAccessQueryData };
  get_players_id_cave: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: CaveOverviewQueryData };
  get_players_id_cave_plant_options: {
    path: { id: number };
    query: { plotIndex?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_cave_formations: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: CaveFormationQueryItem[] };
  post_players_id_cave_formations_activate: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { keyword: string };
    response: CaveFormationActivateResult;
  };
  delete_players_id_cave_formations_category: {
    path: { id: number; category: string };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: CaveFormationRemoveResult;
  };
  post_players_id_cave_plots_plant: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { plotIndex: number; seedName: string };
    response: CavePlantResult;
  };
  post_players_id_cave_plots_care: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { action: string; plotIndex: number };
    response: unknown;
  };
  post_players_id_cave_plots_harvest: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { plotIndex?: number };
    response: unknown;
  };
  get_players_id_cave_plots_plotIndex_acceleration_preview: {
    path: { id: number; plotIndex: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_cave_plots_accelerate: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { accelerator?: string; count?: number; plotIndex: number };
    response: unknown;
  };
  get_players_id_cave_logs: {
    path: { id: number };
    query: { page?: number; pageSize?: number; cursor?: string };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: CaveLogQueryData;
  };
  get_players_id_cave_visit_ownerId: {
    path: { id: number; ownerId: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: CaveVisitQueryData;
  };
  get_players_id_cave_nearby: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: CaveNearbyQueryData;
  };
  post_players_id_cave_plots_cultivate: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { plotIndex?: number };
    response: CaveCultivateResult;
  };
  post_players_id_cave_plots_upgrade: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { plotIndex?: number };
    response: unknown;
  };
  post_players_id_cave_collaborations: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { action: string; ownerId: number; plotIndex?: number };
    response: unknown;
  };
  post_players_id_cave_steals: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { ownerId: number; plotIndex?: number };
    response: unknown;
  };
}
