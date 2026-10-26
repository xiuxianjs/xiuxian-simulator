// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { TeamsOperations } from './types.js';
export { teamsOperationDefinitions } from './operations.js';

export function createTeamsApi(client: APIClient) {
  return {
    post_players_id_team_workflow: (...args: RequestArguments<'post_players_id_team_workflow'>) => client.request('post_players_id_team_workflow', ...args),
    patch_players_id_team_min_realm: (...args: RequestArguments<'patch_players_id_team_min_realm'>) => client.request('patch_players_id_team_min_realm', ...args),
    get_teams_match_snapshot: (...args: RequestArguments<'get_teams_match_snapshot'>) => client.request('get_teams_match_snapshot', ...args),
    get_players_id_team_overview: (...args: RequestArguments<'get_players_id_team_overview'>) => {
      return client.request('get_players_id_team_overview', ...args);
    },
    get_players_id_team_application_records: (...args: RequestArguments<'get_players_id_team_application_records'>) => client.request('get_players_id_team_application_records', ...args),
    get_players_id_team_pending_applications: (...args: RequestArguments<'get_players_id_team_pending_applications'>) => client.request('get_players_id_team_pending_applications', ...args),
    get_teams_battle_records: (...args: RequestArguments<'get_teams_battle_records'>) => {
      return client.request('get_teams_battle_records', ...args);
    },
    get_teams_battle_records_recordId: (...args: RequestArguments<'get_teams_battle_records_recordId'>) => {
      return client.request('get_teams_battle_records_recordId', ...args);
    },
    get_teams: (...args: RequestArguments<'get_teams'>) => {
      return client.request('get_teams', ...args);
    },
    post_teams: (...args: RequestArguments<'post_teams'>) => {
      return client.request('post_teams', ...args);
    },
    get_teams_teamId: (...args: RequestArguments<'get_teams_teamId'>) => {
      return client.request('get_teams_teamId', ...args);
    },
    get_teams_mine: (...args: RequestArguments<'get_teams_mine'>) => {
      return client.request('get_teams_mine', ...args);
    },
    delete_teams_mine: (...args: RequestArguments<'delete_teams_mine'>) => {
      return client.request('delete_teams_mine', ...args);
    },
    delete_teams_members_memberId: (...args: RequestArguments<'delete_teams_members_memberId'>) => {
      return client.request('delete_teams_members_memberId', ...args);
    },
    patch_teams_members_memberId_position: (...args: RequestArguments<'patch_teams_members_memberId_position'>) => {
      return client.request('patch_teams_members_memberId_position', ...args);
    },
    get_teams_position_target: (...args: RequestArguments<'get_teams_position_target'>) => {
      return client.request('get_teams_position_target', ...args);
    },
    post_teams_leadership_transfer: (...args: RequestArguments<'post_teams_leadership_transfer'>) => {
      return client.request('post_teams_leadership_transfer', ...args);
    },

    post_teams_teamId_join: (...args: RequestArguments<'post_teams_teamId_join'>) => {
      return client.request('post_teams_teamId_join', ...args);
    },
    get_teams_teamId_applications: (...args: RequestArguments<'get_teams_teamId_applications'>) => {
      return client.request('get_teams_teamId_applications', ...args);
    },
    post_teams_teamId_applications: (...args: RequestArguments<'post_teams_teamId_applications'>) => {
      return client.request('post_teams_teamId_applications', ...args);
    },
    get_teams_applications: (...args: RequestArguments<'get_teams_applications'>) => {
      return client.request('get_teams_applications', ...args);
    },
    get_teams_invitations: (...args: RequestArguments<'get_teams_invitations'>) => {
      return client.request('get_teams_invitations', ...args);
    },
    post_teams_invitations: (...args: RequestArguments<'post_teams_invitations'>) => {
      return client.request('post_teams_invitations', ...args);
    },
    post_teams_invitations_invitationId_accept: (...args: RequestArguments<'post_teams_invitations_invitationId_accept'>) => {
      return client.request('post_teams_invitations_invitationId_accept', ...args);
    },
    delete_teams_invitations_invitationId: (...args: RequestArguments<'delete_teams_invitations_invitationId'>) => {
      return client.request('delete_teams_invitations_invitationId', ...args);
    },
    post_teams_invitations_invitationId_reject: (...args: RequestArguments<'post_teams_invitations_invitationId_reject'>) => {
      return client.request('post_teams_invitations_invitationId_reject', ...args);
    },
    delete_teams_applications_applicationId: (...args: RequestArguments<'delete_teams_applications_applicationId'>) => {
      return client.request('delete_teams_applications_applicationId', ...args);
    },
    post_teams_applications_applicationId_approve: (...args: RequestArguments<'post_teams_applications_applicationId_approve'>) => {
      return client.request('post_teams_applications_applicationId_approve', ...args);
    },
    post_teams_applications_applicationId_reject: (...args: RequestArguments<'post_teams_applications_applicationId_reject'>) => {
      return client.request('post_teams_applications_applicationId_reject', ...args);
    },
    post_teams_leave: (...args: RequestArguments<'post_teams_leave'>) => {
      return client.request('post_teams_leave', ...args);
    },
    get_teams_match: (...args: RequestArguments<'get_teams_match'>) => {
      return client.request('get_teams_match', ...args);
    },
    post_teams_match: (...args: RequestArguments<'post_teams_match'>) => {
      return client.request('post_teams_match', ...args);
    },
    post_teams_match_cancel: (...args: RequestArguments<'post_teams_match_cancel'>) => {
      return client.request('post_teams_match_cancel', ...args);
    }
  };
}
