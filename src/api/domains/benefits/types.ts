import type { NewcomerLoginQueryData } from '../../schemas/newcomer-login-query';
import type { RechargeCatalogQueryData } from '../../schemas/recharge-catalog-query';
import type { RechargeNormalPackagesQueryData } from '../../schemas/recharge-normal-packages-query';
import type { EventRechargeQueryGroup } from '../../schemas/event-recharge-query';
import type { EventTokenQueryItem } from '../../schemas/event-tokens-query';
import type { VipPrivilegesQueryData } from '../../schemas/vip-privileges-query';
import type { NewcomerRechargeQueryData } from '../../schemas/newcomer-recharge-query';
import type { NewcomerRechargeClaimData } from '../../schemas/newcomer-recharge-claim';
import type { WeeklyRebateQueryData } from '../../schemas/weekly-rebate-query';
import type { FirstRechargeQueryData } from '../../schemas/first-recharge-query';
import type { RechargeRightsQueryData } from '../../schemas/recharge-rights-query';
import type { MonthCardDailyRewardClaimResult, MonthCardDailyRewardStatusData } from '../../schemas/month-card-daily-rewards';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface BenefitsOperations {
  get_players_id_activities_newcomer_login: { path: { id: number }; query: never; headers: never; body: never; response: NewcomerLoginQueryData };
  post_players_id_activities_newcomer_login_claim: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_activities_newcomer_login_tasks_taskId_claim: {
    path: { id: number; taskId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_recharge_catalog: { path: { id: number }; query: never; headers: never; body: never; response: RechargeCatalogQueryData };
  get_players_id_recharge_normal_packages: { path: { id: number }; query: never; headers: never; body: never; response: RechargeNormalPackagesQueryData };
  get_players_id_recharge_rights: { path: { id: number }; query: never; headers: never; body: never; response: RechargeRightsQueryData };
  get_players_id_limited_events_tokens: {
    path: { id: number };
    query: never;
    headers: never;
    body: never;
    response: EventTokenQueryItem[];
  };
  get_players_id_vip_privileges: {
    path: { id: number };
    query: never;
    headers: never;
    body: never;
    response: VipPrivilegesQueryData;
  };
  get_players_id_limited_events_recharge_tiers: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_limited_events_recharge_tiers_subActivityId_claim: {
    path: { id: number; subActivityId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { tierLevel: number };
    response: unknown;
  };
  get_players_id_limited_events_recharge_packages: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: EventRechargeQueryGroup[];
  };
  get_players_id_recharge_overview: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_recharge_first: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: FirstRechargeQueryData };
  post_players_id_recharge_first_tiers_tierAmount_claim: {
    path: { id: number; tierAmount: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_recharge_weekly_rebate: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: WeeklyRebateQueryData;
  };
  post_players_id_recharge_weekly_rebate_dayIndex_claim: {
    path: { id: number; dayIndex: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_recharge_newcomer_claim: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { dayIndex: number };
    response: NewcomerRechargeClaimData;
  };
  get_players_id_recharge_newcomer: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: NewcomerRechargeQueryData;
  };
  get_players_id_recharge_vip: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_recharge_double: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_recharge_month_card: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_recharge_month_card_daily_rewards: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: MonthCardDailyRewardStatusData;
  };
  post_players_id_recharge_month_card_daily_rewards_claim_all: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: MonthCardDailyRewardClaimResult;
  };
  get_players_id_recharge_world_milestones: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_recharge_world_milestones_order_claim: {
    path: { id: number; order: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_recharge_world_milestones_claim_all: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
}
