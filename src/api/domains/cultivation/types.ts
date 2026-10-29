import type { TribulationParticipationResult } from '../../schemas/public-tribulation';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { Schemas } from '../../schemas/index.js';
import type { PeiyuanCancelResult } from '../../schemas/peiyuan-cancel';
import type { ResourceRegenSettlement } from '../../schemas/resource-regen-settlement';
import type { GreenBottleStorageCapacityQuery } from '../../schemas/green-bottle-storage-capacity-query';
import type { GreenBottleStoreResult } from '../../schemas/green-bottle-store';
import type { SeclusionEndData } from '../../schemas/seclusion-end';
import type {
  TribulationPreparation,
  TribulationHeartDemon,
  TribulationHeartChoice,
  TribulationEvasionResult,
  TribulationConfirmation,
  TribulationInput,
  TribulationReceipt,
  TribulationCharging,
  TribulationGrade
} from '../../schemas/tribulation';
import type { PublicTribulationEvent, PublicTribulationQuery, TribulationDisruptionResult } from '../../schemas/public-tribulation';

export interface CultivationOperations {
  post_players_id_seclusion_command: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { action: 'view' | 'select' | 'start'; dungeonName?: string; duration?: number };
    response: unknown;
  };
  post_players_id_tribulation_events_eventId_confirmation_query: {
    path: { id: number; eventId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { grade: 'low' | 'standard' | 'high' };
    response: unknown;
  };
  post_players_id_realm_promotion_command: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: Record<string, never>;
    response: unknown;
  };
  post_players_id_tribulation_events_eventId_heart_demon: {
    path: { id: number; eventId: number };
    query: never;
    headers: never;
    body: { choice: TribulationHeartChoice; policyVersion: string };
    response: TribulationHeartDemon;
  };
  post_players_id_tribulation_events_eventId_evade: {
    path: { id: number; eventId: number };
    query: never;
    headers: never;
    body: never;
    response: TribulationEvasionResult;
  };
  post_players_id_tribulation_events_eventId_participate: {
    path: { id: number; eventId: number };
    query: never;
    headers: never;
    body: never;
    response: TribulationParticipationResult;
  };
  post_players_id_tribulation_events_eventId_disrupt: {
    path: { id: number; eventId: number };
    query: never;
    headers: never;
    body: never;
    response: TribulationDisruptionResult;
  };
  get_tribulation_events: { path: never; query: PublicTribulationQuery; headers: never; body: never; response: PublicTribulationEvent[] };
  get_tribulation_events_eventId: { path: { eventId: number }; query: never; headers: never; body: never; response: PublicTribulationEvent };
  post_players_id_tribulation_events_eventId_confirmation: {
    path: { id: number; eventId: number };
    query: never;
    headers: never;
    body: { grade: TribulationGrade };
    response: TribulationConfirmation;
  };
  post_players_id_tribulation_events_eventId_open: {
    path: { id: number; eventId: number };
    query: never;
    headers: never;
    body: never;
    response: TribulationPreparation;
  };
  post_players_id_tribulation_events_eventId_start: {
    path: { id: number; eventId: number };
    query: never;
    headers: never;
    body: TribulationInput;
    response: TribulationReceipt | TribulationCharging;
  };
  get_players_id_tribulation_events_eventId_result: {
    path: { id: number; eventId: number };
    query: never;
    headers: never;
    body: never;
    response: TribulationReceipt | TribulationCharging;
  };
  post_players_id_entry: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { messageText: string };
    response: {
      maintenance: { disabled: boolean; reason?: string; endTime?: string };
      routeAllowed: boolean;
      featureGuard?: { blocked: boolean; feature?: string; reason?: string; realmName?: string };
      nativeComebackProcessed: boolean;
      resourcesSettled: boolean;
      processingError?: string;
    };
  };
  post_players_id_command_availability: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { messageText: string };
    response: { disabled: boolean; reason?: string; endTime?: string };
  };
  post_players_id_native_comeback_on_entry: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: { cycleCreated: boolean; activityQueued: boolean };
  };
  post_players_id_resources_settle: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: ResourceRegenSettlement;
  };
  get_players_id_mental: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    /** Legacy single-resource projection; the service settles both resources before returning it. */
    response: { current: number; cap: number; nextTickRemainingMs: number };
  };
  get_players_id_meditation_active: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_meditation_guard: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { command: string };
    response: unknown;
  };
  post_players_id_meditation_start: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { boostHours?: number };
    response: unknown;
  };
  post_players_id_meditation_settle: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_spirit_root: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_spirit_root_materials: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_realm_overview: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_realm_breakthrough: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_realm_breakthrough: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_realm_promotion: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_realm_promotion: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Replay-Seed'?: number; 'X-Replay-Time'?: string; 'X-Request-ID'?: string };
    body: { seed?: number };
    response: unknown;
  };
  get_players_id_realm_tribulation_preview: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_meridians: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: Schemas['MeridianView'] };
  post_players_id_meridians_pulse: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Replay-Seed'?: number; 'X-Replay-Time'?: string; 'X-Request-ID'?: string };
    body: { seed?: number };
    response: Schemas['MeridianPulse'];
  };
  get_players_id_seclusion: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_seclusion_guard: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { command: string };
    response: { inSeclusion: boolean; allowed: boolean };
  };
  get_players_id_seclusion_selection: {
    path: { id: number };
    query: { dungeonName: string };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_seclusion_active_marker_repair: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_seclusion_preview: {
    path: { id: number };
    query: { duration: 1 | 2 | 4 | 8 | 12; dungeonId: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_seclusion_start: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { duration: 1 | 2 | 4 | 8 | 12; dungeonId: number };
    response: unknown;
  };
  post_players_id_seclusion_start_by_name: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { dungeonName: string; duration: number };
    response: unknown;
  };
  post_players_id_seclusion_end: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: SeclusionEndData;
  };
  get_players_id_soul_path: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_soul_path_choose: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { pathKey: 'xuan_fa' | 'lian_ti' | 'yu_qi' };
    response: unknown;
  };
  post_players_id_soul_path_choose_preview: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { pathKey: 'xuan_fa' | 'lian_ti' | 'yu_qi' };
    response: unknown;
  };
  post_players_id_soul_path_choose_confirm: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { token: string };
    response: unknown;
  };
  post_players_id_soul_path_action_preview: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { action: 'switch' | 'advance' | 'reroll'; pathKey?: 'xuan_fa' | 'lian_ti' | 'yu_qi' | null };
    response: unknown;
  };
  post_players_id_soul_path_action_confirm: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { token: string };
    response: unknown;
  };
  post_players_id_soul_path_switch: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { pathKey: 'xuan_fa' | 'lian_ti' | 'yu_qi' };
    response: unknown;
  };
  post_players_id_soul_path_advance: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_soul_path_nurture: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { direction: 'ding_hun' | 'yang_po' | 'wu_dao' | 'chu_qiao' };
    response: unknown;
  };
  post_players_id_soul_path_reroll: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  put_players_id_soul_path_supply_direction: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { direction: ('ding_hun' | 'yang_po' | 'wu_dao' | 'chu_qiao') | null };
    response: unknown;
  };

  post_players_id_green_bottle_convert: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { count?: number };
    response: GreenBottleStoreResult;
  };
  post_players_id_peiyuan_dan_use: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { itemId: number; quantity?: number; seed: number; ranges?: { [key: string]: Record<string, unknown> } };
    response: unknown;
  };
  post_players_id_peiyuan_dan_confirm: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_peiyuan_dan_cancel: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: PeiyuanCancelResult;
  };
  get_players_id_green_bottle: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_green_bottle_storage_capacity: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: GreenBottleStorageCapacityQuery;
  };
  get_players_id_native_comeback: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_native_comeback_claim: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
}
