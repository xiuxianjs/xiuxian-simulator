import type { GuildWorkflowInput, GuildWorkflowResults } from '../../schemas/guild-workflow';
import type { GuildWeeklyTaskQueryData } from '../../schemas/guild-weekly-task-query';
import type { GuildDailyTaskQueryData } from '../../schemas/guild-daily-task-query';
import type { GuildLeaveConfirmationCancelResult } from '../../schemas/guild-leave-confirmation-cancel';
import type { GuildMinRealmOptionsData, GuildMinRealmSetData } from '../../schemas/guild-min-realm';
import type { GuildContentUpdateResult } from '../../schemas/guild-content-update';
import type { GuildRenameResult } from '../../schemas/guild-rename';
import type { GuildEssencesQueryResult } from '../../schemas/guild-essences';
import type { GuildActivityRefreshResult, GuildContentQueryResult } from '../../schemas/guild-content';
import type { GuildRoleOptionsQueryData } from '../../schemas/guild-role-options-query';
import type { GuildHomeQueryData } from '../../schemas/guild-home-query';
import type { GuildResignationOptions } from '../../schemas/guild-resignation-options';
import type {
  GuildBattleTrainingState,
  GuildBattleTrainingUpgradeResult,
  GuildBattleTrainingBranch,
  GuildBattleTrainingKey
} from '../../schemas/guild-battle-training';
import type { GuildMyRedPacketsQueryData } from '../../schemas/guild-my-red-packets-query';
import type { GuildRedPacketsQueryData } from '../../schemas/guild-red-packets-query';
import type { GuildReviewQueryData } from '../../schemas/guild-review-query';
import type { PlayerGuildMembersData, GuildListData, PlayerGuildLogsData, GuildStorylineRecordsData } from '../../schemas/queries';
// Contract maintained against Go docs/openapi.yaml; verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface SectsOperations {
  post_players_id_guild_workflow: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: GuildWorkflowInput;
    response: GuildWorkflowResults[GuildWorkflowInput['action']];
  };
  post_players_id_guild_storyline_challenge: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { seed?: number } | never;
    response: unknown;
  };
  delete_players_id_guild_leave_confirmation: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: never;
    response: GuildLeaveConfirmationCancelResult;
  };
  get_players_id_guild_realm_options: { path: { id: number }; query: never; headers: never; body: never; response: GuildMinRealmOptionsData };
  get_players_id_guild_home: { path: { id: number }; query: never; headers: never; body: never; response: GuildHomeQueryData };
  patch_players_id_guild_min_realm: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { minRealmId: number | null };
    response: GuildMinRealmSetData;
  };
  post_players_id_guild_rename: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { name: string };
    response: GuildRenameResult;
  };
  patch_players_id_guild_content: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { field: 'intro' | 'notice'; content: string };
    response: GuildContentUpdateResult;
  };
  get_players_id_guild_essences: { path: { id: number }; query: { page?: number }; headers: never; body: never; response: GuildEssencesQueryResult };
  get_players_id_guild_content: { path: { id: number }; query: never; headers: never; body: never; response: GuildContentQueryResult };
  post_players_id_guild_activity: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: never;
    response: GuildActivityRefreshResult;
  };
  get_players_id_guild_role_options: {
    path: { id: number };
    query: never;
    headers: never;
    body: never;
    response: GuildRoleOptionsQueryData;
  };
  get_players_id_guild_resignation_options: {
    path: { id: number };
    query: never;
    headers: never;
    body: never;
    response: GuildResignationOptions;
  };
  get_players_id_guild_review_applications: {
    path: { id: number };
    query: { page?: number; cursor?: string };
    headers: never;
    body: never;
    response: GuildReviewQueryData;
  };
  get_players_id_guild_members: {
    path: { id: number };
    query: { page?: number; pageSize?: number };
    headers: never;
    body: never;
    response: PlayerGuildMembersData;
  };
  get_players_id_guild_logs: { path: { id: number }; query: { page?: number; pageSize?: number }; headers: never; body: never; response: PlayerGuildLogsData };
  get_guilds: { path: never; query: { page?: number; pageSize?: number }; headers: never; body: never; response: GuildListData };
  get_guilds_guildId_logs: { path: { guildId: number }; query: { page?: number; pageSize?: number }; headers: never; body: never; response: unknown };
  get_players_id_guild_milestones_types_type: {
    path: { id: number; type: 'daily_activity' | 'weekly_activity' };
    query: never;
    headers: never;
    body: never;
    response: unknown;
  };
  get_players_id_guild_red_packets: { path: { id: number }; query: never; headers: never; body: never; response: GuildRedPacketsQueryData };
  post_players_id_guild_red_packets: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: {
      currencyType: 'spirit_stone' | 'spirits_crystal' | 'contribution';
      packetCount: 5 | 10 | 15 | 20 | 25 | 30;
      perAmount: 100 | 1000 | 10000 | 100000;
    };
    response: unknown;
  };
  get_players_id_guild_red_packets_mine: { path: { id: number }; query: never; headers: never; body: never; response: GuildMyRedPacketsQueryData };
  get_players_id_guild_storyline_records: { path: { id: number }; query: never; headers: never; body: never; response: GuildStorylineRecordsData };
  get_players_id_guild_tasks_type: {
    path: { id: number; type: 'daily' | 'weekly' };
    query: never;
    headers: never;
    body: never;
    response: GuildDailyTaskQueryData | GuildWeeklyTaskQueryData;
  };
  get_players_id_guild_storyline: { path: { id: number }; query: never; headers: never; body: never; response: unknown };
  post_players_id_guild_storyline_stages_stageIndex_claim: {
    path: { id: number; stageIndex: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_red_packets_packetId_claim: {
    path: { id: number; packetId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_red_packets_packetId_recycle: {
    path: { id: number; packetId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_milestones_claims_milestoneId: {
    path: { id: number; milestoneId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_milestones_types_type_claim_all: {
    path: { id: number; type: 'daily_activity' | 'weekly_activity' };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_guild_battle_training: {
    path: { id: number };
    query: never;
    headers: never;
    body: never;
    response: GuildBattleTrainingState;
  };
  post_players_id_guild_battle_training: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { branch: GuildBattleTrainingBranch; key: GuildBattleTrainingKey };
    response: GuildBattleTrainingUpgradeResult;
  };
}
