// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { SectsOperations } from './types.js';
export { sectsOperationDefinitions } from './operations.js';

export function createSectsApi(client: APIClient) {
  return {
    post_players_id_guild_workflow: (...args: RequestArguments<'post_players_id_guild_workflow'>) => client.request('post_players_id_guild_workflow', ...args),
    get_players_id_guild_battle_training: (...args: RequestArguments<'get_players_id_guild_battle_training'>) => client.request('get_players_id_guild_battle_training', ...args),
    post_players_id_guild_battle_training: (...args: RequestArguments<'post_players_id_guild_battle_training'>) => client.request('post_players_id_guild_battle_training', ...args),
    delete_players_id_guild_leave_confirmation: (...args: RequestArguments<'delete_players_id_guild_leave_confirmation'>) => client.request('delete_players_id_guild_leave_confirmation', ...args),
    get_players_id_guild_realm_options: (...args: RequestArguments<'get_players_id_guild_realm_options'>) => client.request('get_players_id_guild_realm_options', ...args),
    get_players_id_guild_home: (...args: RequestArguments<'get_players_id_guild_home'>) => client.request('get_players_id_guild_home', ...args),
    patch_players_id_guild_min_realm: (...args: RequestArguments<'patch_players_id_guild_min_realm'>) => client.request('patch_players_id_guild_min_realm', ...args),
    post_players_id_guild_rename: (...args: RequestArguments<'post_players_id_guild_rename'>) => client.request('post_players_id_guild_rename', ...args),

    patch_players_id_guild_content: (...args: RequestArguments<'patch_players_id_guild_content'>) => client.request('patch_players_id_guild_content', ...args),
    get_players_id_guild_essences: (...args: RequestArguments<'get_players_id_guild_essences'>) => client.request('get_players_id_guild_essences', ...args),
    post_players_id_guild_activity: (...args: RequestArguments<'post_players_id_guild_activity'>) => client.request('post_players_id_guild_activity', ...args),
    get_players_id_guild_content: (...args: RequestArguments<'get_players_id_guild_content'>) => client.request('get_players_id_guild_content', ...args),

    get_players_id_guild_role_options: (...args: RequestArguments<'get_players_id_guild_role_options'>) => {
      return client.request('get_players_id_guild_role_options', ...args);
    },
    get_players_id_guild_review_applications: (...args: RequestArguments<'get_players_id_guild_review_applications'>) => client.request('get_players_id_guild_review_applications', ...args),
    get_players_id_guild_members: (...args: RequestArguments<'get_players_id_guild_members'>) => client.request('get_players_id_guild_members', ...args),
    get_players_id_guild_logs: (...args: RequestArguments<'get_players_id_guild_logs'>) => client.request('get_players_id_guild_logs', ...args),
    get_guilds: (...args: RequestArguments<'get_guilds'>) => client.request('get_guilds', ...args),
    get_guilds_guildId_logs: (...args: RequestArguments<'get_guilds_guildId_logs'>) => {
      return client.request('get_guilds_guildId_logs', ...args);
    },
    get_players_id_guild_milestones_types_type: (...args: RequestArguments<'get_players_id_guild_milestones_types_type'>) => {
      return client.request('get_players_id_guild_milestones_types_type', ...args);
    },
    get_players_id_guild_red_packets: (...args: RequestArguments<'get_players_id_guild_red_packets'>) => {
      return client.request('get_players_id_guild_red_packets', ...args);
    },
    post_players_id_guild_red_packets: (...args: RequestArguments<'post_players_id_guild_red_packets'>) => {
      return client.request('post_players_id_guild_red_packets', ...args);
    },
    get_players_id_guild_red_packets_mine: (...args: RequestArguments<'get_players_id_guild_red_packets_mine'>) => {
      return client.request('get_players_id_guild_red_packets_mine', ...args);
    },
    get_players_id_guild_storyline_records: (...args: RequestArguments<'get_players_id_guild_storyline_records'>) => {
      return client.request('get_players_id_guild_storyline_records', ...args);
    },
    get_players_id_guild_tasks_type: (...args: RequestArguments<'get_players_id_guild_tasks_type'>) => {
      return client.request('get_players_id_guild_tasks_type', ...args);
    },
    get_players_id_guild_storyline: (...args: RequestArguments<'get_players_id_guild_storyline'>) => {
      return client.request('get_players_id_guild_storyline', ...args);
    },
    post_players_id_guild_storyline_challenge: (...args: RequestArguments<'post_players_id_guild_storyline_challenge'>) => client.request('post_players_id_guild_storyline_challenge', ...args),
    post_players_id_guild_storyline_stages_stageIndex_claim: (...args: RequestArguments<'post_players_id_guild_storyline_stages_stageIndex_claim'>) => {
      return client.request('post_players_id_guild_storyline_stages_stageIndex_claim', ...args);
    },
    post_players_id_guild_red_packets_packetId_claim: (...args: RequestArguments<'post_players_id_guild_red_packets_packetId_claim'>) => {
      return client.request('post_players_id_guild_red_packets_packetId_claim', ...args);
    },
    post_players_id_guild_red_packets_packetId_recycle: (...args: RequestArguments<'post_players_id_guild_red_packets_packetId_recycle'>) => {
      return client.request('post_players_id_guild_red_packets_packetId_recycle', ...args);
    },
    post_players_id_guild_milestones_claims_milestoneId: (...args: RequestArguments<'post_players_id_guild_milestones_claims_milestoneId'>) => {
      return client.request('post_players_id_guild_milestones_claims_milestoneId', ...args);
    },
    post_players_id_guild_milestones_types_type_claim_all: (...args: RequestArguments<'post_players_id_guild_milestones_types_type_claim_all'>) => {
      return client.request('post_players_id_guild_milestones_types_type_claim_all', ...args);
    }
  };
}
