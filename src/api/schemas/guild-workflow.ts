import type { GuildResignationOptions } from './guild-resignation-options';
import type { GuildContentQueryResult } from './guild-content';
import type { GuildContentUpdateResult } from './guild-content-update';
import type { GuildEssenceAddResult } from './guild-essence-add';
import type { GuildEssenceRemovalResult } from './guild-essence-removal';
import type { GuildEssencesQueryResult } from './guild-essences';
import type { GuildMinRealmSetData } from './guild-min-realm';
import type { GuildShopAutoRefreshData } from './guild-shop-auto-refresh';
import type { GuildShopPageData } from './guild-shop-page';
import type { GuildMemberMutation } from '../bot/guild-member-lifecycle';
import type { GuildDissolveMutation } from '../bot/guild-dissolve';

export type GuildWorkflowInput =
  | { action: 'resignation_options' }
  | { action: 'content' }
  | { action: 'content_update'; field: 'intro' | 'notice'; content: string }
  | { action: 'essence_add'; content: string }
  | { action: 'essence_remove'; essenceId: number }
  | { action: 'essences'; page: number }
  | { action: 'min_realm'; searchTerm: string }
  | { action: 'role_appoint'; targetUserId?: number; targetBid?: string; previewOnly?: boolean; roleName: string }
  | { action: 'role_resign'; targetUserId?: number; targetBid?: string; previewOnly?: boolean }
  | { action: 'auto_refresh'; mode: 'hours' | 'enable' | 'disable' | 'invalid'; hours?: number[] }
  | { action: 'dissolve' }
  | { action: 'shop_refresh' }
  | { action: 'storyline_claim'; stageIndex?: number };
export type GuildWorkflowResults = {
  resignation_options: GuildResignationOptions;
  content: GuildContentQueryResult;
  content_update: GuildContentUpdateResult;
  essence_add: GuildEssenceAddResult;
  essence_remove: GuildEssenceRemovalResult;
  essences: GuildEssencesQueryResult;
  min_realm: (GuildMinRealmSetData & { matchedRealmName?: string }) | { outcome: 'input_required' | 'not_found' };
  role_appoint: GuildMemberMutation | { outcome: 'role_missing' } | { outcome: 'target_missing'; roles: { id: number; name: string }[] };
  role_resign: { kind: 'resign' | 'demote'; result: GuildMemberMutation } | { kind: 'options'; options: GuildResignationOptions } | { kind: 'role_missing' };
  auto_refresh: GuildShopAutoRefreshData | { outcome: 'hours_required' | 'invalid_parameter'; isLeader: boolean; isViceLeader: boolean };
  dissolve: GuildDissolveMutation | { outcome: 'not_joined' };
  shop_refresh: { receipt: { guildId: number; cost: number; remaining: number; itemCount: number }; page?: GuildShopPageData; pageError?: string };
  storyline_claim: { stageIndex: number; spiritCrystal: number; partial?: true; claimedStages?: number[]; failedStage?: number; failureReason?: string };
};
