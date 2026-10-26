import type { TowerShopAchievementQueryData } from '../../schemas/tower-shop-achievement-query';
import type { EmailDeleteAllData } from '../../schemas/email-delete-all';
import type { ThemeActivateResult, ThemeDeactivateResult } from '../../schemas/theme-state';
import type { EmailDeleteData } from '../../schemas/email-delete';
import type { EmailDetailData } from '../../schemas/email-detail';
import type { ThemeInkModeData } from '../../schemas/theme-ink-mode';
import type { ActivityPointsQueryData } from '../../schemas/activity-points-query';
import type { EventTaskQueryGroup } from '../../schemas/event-tasks-query';
import type { LimitedEventOverviewQueryItem } from '../../schemas/event-overview-query';
import type { ThemeQueryData } from '../../schemas/theme-query';
import type { BountyQueryPage } from '../../schemas/bounty-query';
import type { EmailPageData } from '../../schemas/queries';
import type { AchievementPageData } from '../../schemas/queries';
import type { GeneralAchievementQueryData } from '../../schemas/general-achievement-query';
import type { WorldBossInfoQueryData } from '../../schemas/world-boss-info-query';
import type { StorylineAchievementQueryData } from '../../schemas/storyline-achievement-query';
import type { MasterAchievementQueryData } from '../../schemas/master-achievement-query';
import type { LingzhiAchievementQueryData } from '../../schemas/lingzhi-achievement-query';
import type { CombatPowerAchievementQueryData } from '../../schemas/combat-power-achievement-query';
import type { AchievementOverviewQueryData } from '../../schemas/achievement-overview-query';
import type { AchievementCategoryProjectionData } from '../../schemas/achievement-category-projection';
// Contract maintained against Go docs/openapi.yaml; verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface RewardsOperations {
  get_players_id_achievements_tower_shop: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: TowerShopAchievementQueryData;
  };
  get_players_id_achievements_lingzhi: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: LingzhiAchievementQueryData;
  };
  get_players_id_achievements_master: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: MasterAchievementQueryData;
  };
  get_bounties: {
    path: never;
    query: { page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: BountyQueryPage;
  };
  get_bounties_publish_policy: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_bounties_pending_rewards: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_bounties: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: { targetId: number; amount: number; maxCompletions?: number };
    response: unknown;
  };
  post_bounties_bountyId_accept: {
    path: { bountyId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_bounties_bountyId_challenge: {
    path: { bountyId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { seed?: number };
    response: unknown;
  };
  post_bounties_bountyId_claim: {
    path: { bountyId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_check_ins_hub: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_check_ins_daily: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_check_ins_celestial: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_check_ins_newcomer: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_check_ins_ritual_scope: {
    path: { id: number; scope: 'daily' | 'newcomer' | 'celestial' };
    query: never;
    headers: never;
    body: never;
    response: { ritualText: string };
  };
  get_players_id_emails: {
    path: { id: number };
    query: { page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: EmailPageData;
  };
  delete_players_id_emails: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: EmailDeleteAllData;
  };
  post_players_id_emails_emailId_claim: {
    path: { id: number; emailId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_emails_unread_count: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_emails_claim_all: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_achievements: {
    path: never;
    query: { page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: AchievementPageData;
  };
  get_players_id_achievements: {
    path: { id: number };
    query: { page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: AchievementPageData;
  };
  get_players_id_achievements_overview: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: AchievementOverviewQueryData;
  };
  get_players_id_achievements_general: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: GeneralAchievementQueryData;
  };
  get_players_id_achievements_combat_power: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: CombatPowerAchievementQueryData;
  };
  get_players_id_achievements_storyline: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: StorylineAchievementQueryData;
  };
  get_players_id_world_boss_info_query: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: WorldBossInfoQueryData;
  };
  get_players_id_achievements_category_projection: {
    path: { id: number };
    query: { keyword: string };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: AchievementCategoryProjectionData;
  };
  get_players_id_achievements_categories_category: {
    path: { id: number; category: string };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_achievements_claim: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { category?: string };
    response: unknown;
  };
  get_players_id_themes: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: ThemeQueryData };
  get_players_id_themes_permission: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_themes_themeId_activate: {
    path: { id: number; themeId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: ThemeActivateResult;
  };
  post_players_id_themes_deactivate: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: ThemeDeactivateResult;
  };
  post_players_id_themes_custom: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { config?: unknown; id?: number; name?: string };
    response: unknown;
  };
  get_players_id_emails_emailId: {
    path: { id: number; emailId: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: EmailDetailData;
  };
  delete_players_id_emails_emailId: {
    path: { id: number; emailId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: EmailDeleteData;
  };
  post_players_id_emails_emailId_delete_attempt: {
    path: { id: number; emailId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: EmailDeleteData;
  };
  post_players_id_gift_codes_redeem: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { code: string };
    response: unknown;
  };
  get_players_id_referral: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_referral_sync: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: { createdRecords: number };
  };
  post_players_id_referral_bind: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { code: string };
    response: unknown;
  };
  post_players_id_referral_claim: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_activities_rewardType: {
    path: { id: number; rewardType: 'daily' | 'weekly' };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: ActivityPointsQueryData;
  };
  post_players_id_activities_rewardType_claim: {
    path: { id: number; rewardType: 'daily' | 'weekly' };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { requiredPoints: number };
    response: unknown;
  };
  post_players_id_activities_rewardType_claim_all: {
    path: { id: number; rewardType: 'daily' | 'weekly' };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_limited_events: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: LimitedEventOverviewQueryItem[];
  };
  get_players_id_limited_events_check_ins: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_limited_events_check_in: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_limited_events_tasks: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: EventTaskQueryGroup[];
  };
  post_players_id_limited_events_tasks_taskId_claim: {
    path: { id: number; taskId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_themes_ink_mode: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { mode: 'ink' | 'dark' };
    response: ThemeInkModeData;
  };
  delete_players_id_themes_custom_themeId: {
    path: { id: number; themeId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
}
