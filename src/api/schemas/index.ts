// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { AuthSchemas } from './auth.js';
export type { AuthSchemas } from './auth.js';
import type { MeridianSchemas } from './meridian.js';
export type { MeridianSchemas } from './meridian.js';
import type { CommonSchemas } from './common.js';
export type { CommonSchemas } from './common.js';
import type { PlayersSchemas } from './players.js';
export type { PlayersSchemas } from './players.js';
import type { InventorySchemas } from './inventory.js';
export type { InventorySchemas } from './inventory.js';

export type Schemas = AuthSchemas & MeridianSchemas & CommonSchemas & PlayersSchemas & InventorySchemas;

export * from './queries';
export * from './tianshi-baolu-unlock-sync';
export * from './shop-query';
export * from './cave-query';
export * from './cave-visit-query';
export * from './cave-nearby-query';
export * from './notice-query';
export * from './glossary-query';
export * from './alchemy-ranking-query';
export * from './bounty-query';
export * from './guild-application-query';
export * from './storyline-ranking-query';
export * from './equipped-query';
export * from './learned-books-query';
export * from './skill-book-switch-options';
export * from './tower-ranking-query';
export * from './popularity-query';
export * from './popularity-like';
export * from './popularity-like';
export * from './master-lineage-query';
export * from './shaqi-query';
export * from './realm-ranking-query';
export * from './team-info-query';
export * from './theme-query';
export * from './equipment-detail-query';
export * from './skill-detail-query';
export * from './soul-artifact-overview-query';
export * from './first-recharge-query';
export * from './cave-formation-query';
export * from './cave-formation-action';
export * from './world-boss-ranking-query';
export * from './world-boss-rewards-query';
export * from './guild-review-query';
export * from './weekly-rebate-query';
export * from './newcomer-recharge-query';
export * from './competition-battle-query';
export * from './item-detail-query';
export * from './random-friend-query';
export * from './vip-privileges-query';
export * from './checkin-shop-query';
export * from './event-tokens-query';
export * from './companion-shop-query';
export * from './unified-shop-query';
export * from './event-shop-query';
export * from './event-recharge-query';
export * from './limited-event-reward-query';
export * from './event-overview-query';
export * from './event-tasks-query';
export * from './fly-mail-query';
export * from './battle-templates-query';
export * from './achievement-category-projection';
export * from './general-achievement-query';
export * from './storyline-achievement-query';
export * from './master-achievement-query';
export * from './world-boss-info-query';
export * from './my-market-listings';
export * from './market-cancel';
export * from './market-browse-query';
export * from './player-shop-visit-query';
export * from './battle-template-delete';
export * from './battle-template-save';
export * from './equipment-unequip-one';
export * from './guild-shop-auto-refresh';
export * from './guild-resignation-options';

export * from './guild-red-packets-query';
export * from './guild-weekly-task-query';
export * from './guild-my-red-packets-query';
export * from './tower-rewards-query';
export * from './companion-info-query';
export * from './activity-points-query';
export * from './storyline-catalog-query';
export * from './master-info-query';
export * from './companion-tasks-query';
export * from './companion-panel-status-query';
export * from './recharge-catalog-query';
export * from './recharge-rights-query';
export * from './month-card-daily-rewards';
export * from './tower-reward-overview-query';
export * from './home-notification-query';
export * from './task-panel-snapshot-query';

export type { TeamMatchSnapshot } from './team-match-snapshot';

export type { RealmAccessQuery } from './realm-access-query';

export type { TianjiaoLeaderboardQuery } from './tianjiao-leaderboard-query';

export type { TianjiaoRewardsQuery } from './tianjiao-rewards-query';

export type { NewcomerLoginQueryData } from './newcomer-login-query';

export type { LearnedSkillVisibilityResult } from './skill-visibility';

export type { GuildRoleOptionsQueryData } from './guild-role-options-query';

export type { ProfileVisibilityPreference } from './profile-visibility';

export type { FriendTeamApprovalPreference, TeamInvitesPreference, TeamDungeonEnergyPreference } from './team-preferences';

export type { SoulWashCancelData } from './soul-wash-cancel';
export type {
  SoulArtifactWashAction,
  SoulArtifactWashConfirm,
  SoulArtifactWashPending,
  SoulArtifactWashPreview,
  SoulArtifactWashStep
} from './soul-artifact-wash';

export type { DungeonBattleModePreference, TeamAutoAcceptInvitePreference } from './enum-preferences';

export type { RepeatRecordData } from './repeat-record';

export type { StorageLockRequest, StorageLockResult } from './storage-lock';

export type { PlayerPreferencesQueryData } from './player-preferences-query';

export type { GroupSubscriptionQueryData } from './group-subscription-query';

export type { TeamCancelApplicationResult } from './team-application-cancel';

export type { SpiritCrystalConfirmationPreference, DaoCrystalConfirmationPreference } from './confirmation-preferences';
export type { PlayerProfileQueryData, PlayerProfileResource } from './player-profile-query';
export type { PlayerProfileActionResult } from './player-profile-action';
export type { ResourceRegenResourceSettlement, ResourceRegenSettlement } from './resource-regen-settlement';
export type { CheckInStatusData } from './checkin-status';
export type { CompanionGiftOptionsQueryData, CompanionGiftTargetQueryData } from './companion-gift-preparation-query';
export type { NotificationSubscriptionDisableData } from './group-subscription-disable';
export type { NotificationHistoryItem, NotificationHistoryQueryData } from './notification-history-query';

export type { FlyMailMuteContext, FlyMailMuteStateResult } from './flymail-mute';
export type { CaptchaMuteReplyClaimResult, CaptchaOperationClaimResult, CaptchaVerifyResult } from './captcha-state';
export type { NewcomerGuideAction, NewcomerGuideActionResult, NewcomerGuideProgress, NewcomerGuideStep } from './newcomer-guide';

export * from './friend-settings';
export * from './blocklist-removal';
export * from './block-user-by-name';

export * from './theme-ink-mode';
export * from './friend-removal';
export * from './notice-detail';

export * from './email-detail';
export * from './guild-application-cancel';
export * from './friend-request-reject';
export * from './friend-request-mutation';

export * from './theme-state';
export * from './email-delete';
export * from './glossary-apply';

export * from './team-leadership-transfer';
export * from './market-credibility';
export * from './task-runtime-snapshot';
export type { GreenBottleStorageCapacityQuery } from './green-bottle-storage-capacity-query';
export type { GreenBottleStoreResult } from './green-bottle-store';
export * from './soul-artifact-unequip';
export * from './soul-artifact-unequip-preview';
export * from './soul-artifact-upgrade';
export * from './soul-artifact-equip';
export * from './skill-book-switch';
export * from './skill-book-decompose';
export * from './skill-book-learn';
export * from './companion-gift';

export * from './guild-daily-task-query';
export * from './guild-checkin';
export * from './guild-worship';
export * from './guild-stipend';
export type { MarketMutationResult, MarketPriceRange, MarketPurchaseLine, SellableMarketAsset, SellableMarketAssetPage } from './market-trade';
export * from './task-runtime-action';
export * from './task-config-action';
