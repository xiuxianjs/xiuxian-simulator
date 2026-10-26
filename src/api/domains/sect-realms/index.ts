// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { SectRealmsOperations } from './types.js';
export { sectRealmsOperationDefinitions } from './operations.js';

export function createSectRealmsApi(client: APIClient) {
  return {
    get_guilds_guildId_members: (...args: RequestArguments<'get_guilds_guildId_members'>) => {
      return client.request('get_guilds_guildId_members', ...args);
    },
    post_players_id_guilds: (...args: RequestArguments<'post_players_id_guilds'>) => {
      return client.request('post_players_id_guilds', ...args);
    },
    delete_players_id_guilds_guildId: (...args: RequestArguments<'delete_players_id_guilds_guildId'>) => {
      return client.request('delete_players_id_guilds_guildId', ...args);
    },
    post_players_id_guild_leadership_transfer: (...args: RequestArguments<'post_players_id_guild_leadership_transfer'>) => {
      return client.request('post_players_id_guild_leadership_transfer', ...args);
    },
    post_players_id_guild_leadership_impeach: (...args: RequestArguments<'post_players_id_guild_leadership_impeach'>) => {
      return client.request('post_players_id_guild_leadership_impeach', ...args);
    },
    get_guilds_guildId_permissions: (...args: RequestArguments<'get_guilds_guildId_permissions'>) => {
      return client.request('get_guilds_guildId_permissions', ...args);
    },
    post_players_id_guild_checkin: (...args: RequestArguments<'post_players_id_guild_checkin'>) => {
      return client.request('post_players_id_guild_checkin', ...args);
    },

    get_guilds_guildId_essences: (...args: RequestArguments<'get_guilds_guildId_essences'>) => {
      return client.request('get_guilds_guildId_essences', ...args);
    },
    post_players_id_guild_essences: (...args: RequestArguments<'post_players_id_guild_essences'>) => {
      return client.request('post_players_id_guild_essences', ...args);
    },
    delete_players_id_guild_essences_essenceId: (...args: RequestArguments<'delete_players_id_guild_essences_essenceId'>) => {
      return client.request('delete_players_id_guild_essences_essenceId', ...args);
    },
    post_players_id_guild_mining: (...args: RequestArguments<'post_players_id_guild_mining'>) => {
      return client.request('post_players_id_guild_mining', ...args);
    },
    get_players_id_guild_worship: (...args: RequestArguments<'get_players_id_guild_worship'>) => {
      return client.request('get_players_id_guild_worship', ...args);
    },
    post_players_id_guild_worship: (...args: RequestArguments<'post_players_id_guild_worship'>) => {
      return client.request('post_players_id_guild_worship', ...args);
    },
    post_players_id_guild_stipend_claim: (...args: RequestArguments<'post_players_id_guild_stipend_claim'>) => {
      return client.request('post_players_id_guild_stipend_claim', ...args);
    },
    get_players_id_guild_shop: (...args: RequestArguments<'get_players_id_guild_shop'>) => {
      return client.request('get_players_id_guild_shop', ...args);
    },
    post_players_id_guild_shop_exchange: (...args: RequestArguments<'post_players_id_guild_shop_exchange'>) => {
      return client.request('post_players_id_guild_shop_exchange', ...args);
    },
    get_players_id_guild_applications: (...args: RequestArguments<'get_players_id_guild_applications'>) => {
      return client.request('get_players_id_guild_applications', ...args);
    },
    post_players_id_guild_applications: (...args: RequestArguments<'post_players_id_guild_applications'>) => {
      return client.request('post_players_id_guild_applications', ...args);
    },
    post_players_id_guild_leave: (...args: RequestArguments<'post_players_id_guild_leave'>) => {
      return client.request('post_players_id_guild_leave', ...args);
    },
    get_guilds_guildId_applications: (...args: RequestArguments<'get_guilds_guildId_applications'>) => {
      return client.request('get_guilds_guildId_applications', ...args);
    },
    post_guilds_guildId_applications_applicationId_approve: (...args: RequestArguments<'post_guilds_guildId_applications_applicationId_approve'>) => {
      return client.request('post_guilds_guildId_applications_applicationId_approve', ...args);
    },
    post_guilds_guildId_applications_applicationId_reject: (...args: RequestArguments<'post_guilds_guildId_applications_applicationId_reject'>) => {
      return client.request('post_guilds_guildId_applications_applicationId_reject', ...args);
    },
    delete_players_id_guild_applications_applicationId: (...args: RequestArguments<'delete_players_id_guild_applications_applicationId'>) => {
      return client.request('delete_players_id_guild_applications_applicationId', ...args);
    },
    post_players_id_guild_role: (...args: RequestArguments<'post_players_id_guild_role'>) => {
      return client.request('post_players_id_guild_role', ...args);
    },
    post_players_id_guild_kick_targetId: (...args: RequestArguments<'post_players_id_guild_kick_targetId'>) => {
      return client.request('post_players_id_guild_kick_targetId', ...args);
    },
    post_players_id_guild_shop_refresh: (...args: RequestArguments<'post_players_id_guild_shop_refresh'>) => {
      return client.request('post_players_id_guild_shop_refresh', ...args);
    },
    post_players_id_guild_upgrade: (...args: RequestArguments<'post_players_id_guild_upgrade'>) => {
      return client.request('post_players_id_guild_upgrade', ...args);
    },
    get_players_id_secret_realms_home: (...args: RequestArguments<'get_players_id_secret_realms_home'>) => {
      return client.request('get_players_id_secret_realms_home', ...args);
    },
    get_secret_realms: (...args: RequestArguments<'get_secret_realms'>) => {
      return client.request('get_secret_realms', ...args);
    },
    get_secret_realms_realmNo: (...args: RequestArguments<'get_secret_realms_realmNo'>) => {
      return client.request('get_secret_realms_realmNo', ...args);
    },
    get_guilds_guildId_secret_realms_scoreboard: (...args: RequestArguments<'get_guilds_guildId_secret_realms_scoreboard'>) => {
      return client.request('get_guilds_guildId_secret_realms_scoreboard', ...args);
    },
    post_players_id_secret_realms_realmNo_positions_positionNo_challenge: (
      ...args: RequestArguments<'post_players_id_secret_realms_realmNo_positions_positionNo_challenge'>
    ) => {
      return client.request('post_players_id_secret_realms_realmNo_positions_positionNo_challenge', ...args);
    },
    post_players_id_secret_realms_claim: (...args: RequestArguments<'post_players_id_secret_realms_claim'>) => {
      return client.request('post_players_id_secret_realms_claim', ...args);
    }
  };
}
