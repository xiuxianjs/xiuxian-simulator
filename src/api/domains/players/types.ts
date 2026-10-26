import type { CompanionConfirmationOverviewData, CompanionPurchaseOverviewData, ShopPurchaseOverviewData } from '../../schemas/interaction-overview';
import type { PlayerShopOwnQueryData } from '../../schemas/player-shop-own';
import type { CheckInRitualResult, MonthCardClaimOverviewData, FirstRechargeClaimOverviewData } from '../../schemas/reward-command-overview';
import type { HomeOverviewData, SettingsOverviewData } from '../../schemas/player-overview';
import type { CaptchaMuteReplyClaimResult, CaptchaOperationClaimResult, CaptchaChallengeResult, CaptchaVerifyResult } from '../../schemas/captcha-state';
import type { PlayerSignatureUpdateResult } from '../../schemas/player-signature';
import type { DaoCrystalConfirmationPreference } from '../../schemas/confirmation-preferences';
import type { SpiritCrystalConfirmationPreference } from '../../schemas/confirmation-preferences';
import type { PlayerPreferencesQueryData } from '../../schemas/player-preferences-query';
import type { RepeatRecordData } from '../../schemas/repeat-record';
import type { TeamAutoAcceptInvitePreference } from '../../schemas/enum-preferences';
import type { DungeonBattleModePreference } from '../../schemas/enum-preferences';
import type { TeamDungeonEnergyPreference } from '../../schemas/team-preferences';
import type { TeamInvitesPreference } from '../../schemas/team-preferences';
import type { FriendTeamApprovalPreference } from '../../schemas/team-preferences';
import type { ProfileVisibilityPreference } from '../../schemas/profile-visibility';
import type { RealmAccessQuery } from '../../schemas/realm-access-query';
import type { PlayerProfileQueryData } from '../../schemas/player-profile-query';
import type { PlayerProfileActionResult } from '../../schemas/player-profile-action';
import type { CheckInStatusData } from '../../schemas/checkin-status';
import type { HomeNotificationQueryData } from '../../schemas/home-notification-query';
import type { NewcomerGuideActionResult, NewcomerGuideProgress } from '../../schemas/newcomer-guide';
import type { TaskPanelSnapshotQueryData } from '../../schemas/task-panel-snapshot-query';
import type { TaskPanelView } from '../../schemas/task-panel-view';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { Schemas } from '../../schemas/index.js';

export interface PlayersOperations {
  get_players_id_referral_invitees: {
    path: { id: number };
    query: { page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_query_presentations: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { query: 'dungeon_detail' | 'newcomer_login' | 'world_milestones'; name?: string };
    response: unknown;
  };
  post_players_id_companion_gifts_command: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { firstParam?: string; secondParam?: string; targetBid?: string };
    response: unknown;
  };
  post_players_id_companion_proposals_command: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string };
    body: { target: string; targetBid?: string; oathIndex?: number; fallbackPage?: number };
    response: unknown;
  };
  post_players_id_tianshi_baolu_panel_query: {
    path: { id: number };
    query: { type?: 'all' | 'equipment_set' | 'skill_book' | 'soul_artifact'; page?: number };
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_companion_shop_purchases_overview: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key': string; 'X-Repeat-Command'?: string };
    body: { productId: number; count: number };
    response: CompanionPurchaseOverviewData;
  };
  post_players_id_shop_purchases_overview: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string };
    body: { productId: number; count: number; confirmed: boolean };
    response: ShopPurchaseOverviewData;
  };
  post_players_id_gacha_named_poolName_pull: {
    path: { id: number; poolName: string };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string };
    body: { count: 1 | 10 };
    response: unknown;
  };
  get_players_id_gacha_named_poolName_view: {
    path: { id: number; poolName: string; view: 'goods' | 'history' };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_market_shop_overview_ensure: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string };
    body: never;
    response: PlayerShopOwnQueryData;
  };
  post_players_id_companion_proposals_overview: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key': string };
    body: { targetUserId: number; oathItemId: number };
    response: unknown;
  };
  post_players_id_companion_confirmation_action: {
    path: { id: number; action: 'upgrade' | 'breakup' };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key': string; 'X-Repeat-Command'?: string };
    body: never;
    response: CompanionConfirmationOverviewData;
  };
  post_players_id_companion_proposals_by_name_action: {
    path: { id: number; action: 'accept' | 'reject' };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key': string; 'X-Repeat-Command'?: string };
    body: { name: string };
    response: unknown;
  };
  post_players_id_recharge_first_tiers_tierAmount_claim_overview: {
    path: { id: number; tierAmount: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: FirstRechargeClaimOverviewData;
  };
  post_players_id_recharge_month_card_daily_rewards_claim_overview: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: MonthCardClaimOverviewData;
  };
  post_players_id_check_ins_scope_with_ritual: {
    path: { id: number; scope: 'daily' | 'newcomer' | 'celestial' };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: CheckInRitualResult;
  };
  post_players_id_referral_overview_sync: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_settings_overview: {
    path: { id: number };
    query: { includeGroup?: boolean };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: SettingsOverviewData;
  };
  post_players_id_home_overview: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Command-Resource-Receipt'?: string };
    body: never;
    response: HomeOverviewData;
  };
  get_players_id_activity_hub: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_guides_newcomer_prepare_promotion: { path: { id: number }; query: never; headers: never; body: never; response: unknown };
  post_players_id_guides_newcomer_completion_reward: { path: { id: number }; query: never; headers: never; body: never; response: unknown };
  post_players_id_guides_newcomer_continue: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { expectedVersion: number };
    response: NewcomerGuideActionResult;
  };
  post_players_id_guides_newcomer_skip: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { expectedVersion: number };
    response: NewcomerGuideActionResult;
  };
  get_players_id_guides_newcomer: { path: { id: number }; query: never; headers: never; body: never; response: NewcomerGuideProgress };
  put_players_id_guides_newcomer: {
    path: { id: number };
    query: never;
    headers: never;
    body: { step: 2 | 3 | 4 | 5; expectedVersion: number };
    response: NewcomerGuideProgress;
  };
  delete_players_id_guides_newcomer: {
    path: { id: number };
    query: never;
    headers: never;
    body: { expectedVersion: number };
    response: NewcomerGuideProgress;
  };
  post_players_id_captcha_state_verify: {
    path: { id: number };
    query: never;
    headers: never;
    body: { answer: string };
    response: CaptchaVerifyResult;
  };
  post_players_id_captcha_state_operations_claim: { path: { id: number }; query: never; headers: never; body: never; response: CaptchaOperationClaimResult };
  post_players_id_captcha_state_challenge: { path: { id: number }; query: never; headers: never; body: never; response: CaptchaChallengeResult };
  post_players_id_captcha_state_mute_reply_claim: { path: { id: number }; query: never; headers: never; body: never; response: CaptchaMuteReplyClaimResult };
  put_players_id_signature: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { signature: string };
    response: PlayerSignatureUpdateResult;
  };
  post_players_id_profile_actions: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { action: 'rename' | 'gender' | 'signature'; value: string };
    response: PlayerProfileActionResult;
  };
  get_players_id_profile: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: PlayerProfileQueryData;
  };
  post_players_id_home_atmosphere_claim: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: { text: string | null; kind: 'absence' | 'ambience' | 'none' };
  };
  get_players_id_public_profile_targetId: {
    path: { id: number; targetId: number };
    query: never;
    headers: never;
    body: never;
    response: unknown;
  };
  patch_players_id_preferences_dao_crystal_confirmation: {
    path: { id: number };
    query: never;
    headers: never;
    body: { confirmDaoCrystal: number | null };
    response: DaoCrystalConfirmationPreference;
  };
  patch_players_id_preferences_spirit_crystal_confirmation: {
    path: { id: number };
    query: never;
    headers: never;
    body: { confirmSpiritCrystal: number | null };
    response: SpiritCrystalConfirmationPreference;
  };
  get_players_id_preferences: { path: { id: number }; query: never; headers: never; body: never; response: PlayerPreferencesQueryData };
  post_players_id_client_state_repeat_record: {
    path: { id: number };
    query: never;
    headers: never;
    body: { command: string; message: string } | { hash: string };
    response: RepeatRecordData;
  };
  patch_players_id_preferences_team_auto_accept_invite: {
    path: { id: number };
    query: never;
    headers: never;
    body: { teamAutoAcceptInvite: 'none' | 'all' | 'friend' | 'companion' };
    response: TeamAutoAcceptInvitePreference;
  };
  patch_players_id_preferences_dungeon_battle_mode: {
    path: { id: number };
    query: never;
    headers: never;
    body: { dungeonBattleMode: 'auto' | 'manual' };
    response: DungeonBattleModePreference;
  };
  patch_players_id_preferences_team_dungeon_energy: {
    path: { id: number };
    query: never;
    headers: never;
    body: { teamDungeonNoMental: boolean };
    response: TeamDungeonEnergyPreference;
  };
  patch_players_id_preferences_team_invites: {
    path: { id: number };
    query: never;
    headers: never;
    body: { teamInviteEnabled: boolean };
    response: TeamInvitesPreference;
  };
  patch_players_id_preferences_friend_team_approval: {
    path: { id: number };
    query: never;
    headers: never;
    body: { autoApproveFriendTeam: boolean };
    response: FriendTeamApprovalPreference;
  };
  patch_players_id_preferences_profile_visibility: {
    path: { id: number };
    query: never;
    headers: never;
    body: { hideProfile: boolean };
    response: ProfileVisibilityPreference;
  };
  get_robot_realm_access: { path: never; query: never; headers: never; body: never; response: RealmAccessQuery };
  get_players_id_home_overview: { path: { id: number }; query: never; headers: never; body: never; response: unknown };
  get_players_id_task_panel_snapshot: { path: { id: number }; query: never; headers: never; body: never; response: TaskPanelSnapshotQueryData };
  get_players_id_task_panel_view: {
    path: { id: number };
    query: { view?: 'full' | 'selected'; tab?: 'checkin' | 'activity' | 'cultivation' | 'dungeon' | 'guild' | 'event' | 'auto' };
    headers: never;
    body: never;
    response: TaskPanelView;
  };
  get_players_id_home_notifications: { path: { id: number }; query: never; headers: never; body: never; response: HomeNotificationQueryData };
  get_players_id_feature_access: { path: { id: number }; query: never; headers: never; body: never; response: unknown };
  get_players_id_check_ins_status: { path: { id: number }; query: never; headers: never; body: never; response: CheckInStatusData };
  get_me: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players: { path: never; query: never; headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string }; body: unknown; response: unknown };
  get_players_id: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: Schemas['PlayerRead'] };
  get_players_by_bid_bid: { path: { bid: string }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: Schemas['PlayerRead'] };
  get_players_id_battle_attributes: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: {
      soulPathComparison: {
        base: Record<string, unknown>;
        actual: Record<string, unknown>;
        changes: Array<{ label: string; before: number; after: number; deltaText: string }>;
        emptyMessage: string;
        quote: string;
      };
      [key: string]: unknown;
    };
  };
  get_players_id_attribute_panel: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
}
