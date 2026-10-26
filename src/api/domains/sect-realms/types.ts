import type { GuildCheckinData } from '../../schemas/guild-checkin';
import type { GuildEssenceAddResult } from '../../schemas/guild-essence-add';
import type { GuildEssenceRemovalResult } from '../../schemas/guild-essence-removal';
import type { GuildCancelApplicationResult } from '../../schemas/guild-application-cancel';
import type { GuildApplicationQueryData } from '../../schemas/guild-application-query';
import type { GuildLeadershipFacts, GuildShopAutoRefreshData } from '../../schemas/guild-shop-auto-refresh';
import type { GuildShopPageData } from '../../schemas/guild-shop-page';
import type { GuildMiningData } from '../../schemas/guild-mining';
import type { GuildStipendData } from '../../schemas/guild-stipend';
import type { GuildWorshipData } from '../../schemas/guild-worship';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface SectRealmsOperations {
  get_guilds_guildId_members: { path: { guildId: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_guilds: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { name: string };
    response: unknown;
  };
  delete_players_id_guilds_guildId: {
    path: { id: number; guildId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_leadership_transfer: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { index: number };
    response: unknown;
  };
  post_players_id_guild_leadership_impeach: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_guilds_guildId_permissions: {
    path: { guildId: number };
    query: { userId: number; action: string; targetRole?: string };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_checkin: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: GuildCheckinData;
  };

  get_guilds_guildId_essences: { path: { guildId: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_guild_essences: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string };
    body: { content: string };
    response: GuildEssenceAddResult;
  };
  delete_players_id_guild_essences_essenceId: {
    path: { id: number; essenceId: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string };
    body: never;
    response: GuildEssenceRemovalResult;
  };
  post_players_id_guild_mining: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: GuildMiningData;
  };
  get_players_id_guild_worship: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: {
      dailyWorshipDone: boolean;
      canWorship: boolean;
      introText: string;
      noticeText: string;
      offers: Array<{ name: '灵石' | '灵晶' | '道晶'; cost: number; activity: number; contribution: number; line: string; canWorship: boolean }>;
    };
  };
  post_players_id_guild_worship: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { offer: '灵石' | '灵晶' | '道晶' };
    response: GuildWorshipData;
  };
  post_players_id_guild_stipend_claim: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: GuildStipendData;
  };
  get_players_id_guild_shop: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_guild_shop_page: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: GuildShopPageData };
  get_players_id_guild_shop_auto_refresh: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: GuildShopAutoRefreshData;
  };
  get_players_id_guild_shop_auto_refresh_write_context: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: GuildShopAutoRefreshData;
  };
  patch_players_id_guild_shop_auto_refresh: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { expectedVersion: string; enabled: boolean; hours: number[] };
    response: GuildShopAutoRefreshData;
  };
  get_players_id_guild_leadership: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: GuildLeadershipFacts };
  post_players_id_guild_shop_exchange: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { itemId: number; itemIndex?: never } | { itemIndex: number; itemId?: never };
    response: unknown;
  };
  get_players_id_guild_applications: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: GuildApplicationQueryData;
  };
  post_players_id_guild_applications: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { guildId: number };
    response: unknown;
  };
  post_players_id_guild_applications_users_targetId_approve: {
    path: { id: number; targetId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_applications_users_targetId_reject: {
    path: { id: number; targetId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_leave: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_guilds_guildId_applications: {
    path: { guildId: number };
    query: { operatorId: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_guilds_guildId_applications_applicationId_approve: {
    path: { guildId: number; applicationId: number };
    query: { operatorId: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_guilds_guildId_applications_applicationId_reject: {
    path: { guildId: number; applicationId: number };
    query: { operatorId: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  delete_players_id_guild_applications_applicationId: {
    path: { id: number; applicationId: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: GuildCancelApplicationResult;
  };
  post_players_id_guild_role: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { targetUserId: number; roleId: number };
    response: unknown;
  };
  post_players_id_guild_kick_targetId: {
    path: { id: number; targetId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_shop_refresh: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_upgrade: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { kind: 'level' | 'vein' | 'shop' };
    response: unknown;
  };
  get_players_id_secret_realms_home: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_secret_realms: {
    path: never;
    query: { cursor?: string; page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_secret_realms_realmNo: {
    path: { realmNo: number };
    query: { page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_guilds_guildId_secret_realms_scoreboard: {
    path: { guildId: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_secret_realms_realmNo_positions_positionNo_challenge: {
    path: { id: number; realmNo: number; positionNo: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_secret_realms_claim: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_leader_leave: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_guild_resign: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
}
