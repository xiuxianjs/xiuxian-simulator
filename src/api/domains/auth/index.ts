// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { AuthOperations } from './types.js';
export { authOperationDefinitions } from './operations.js';

export function createAuthApi(client: APIClient) {
  return {
    post_robot_middleware_entry: (...args: RequestArguments<'post_robot_middleware_entry'>) => {
      return client.request('post_robot_middleware_entry', ...args);
    },
    getRobotIdentity: (...args: RequestArguments<'getRobotIdentity'>) => {
      return client.request('getRobotIdentity', ...args);
    },
    post_auth_email_verifications: (...args: RequestArguments<'post_auth_email_verifications'>) => {
      return client.request('post_auth_email_verifications', ...args);
    },
    post_auth_email_verifications_type_confirm: (...args: RequestArguments<'post_auth_email_verifications_type_confirm'>) => {
      return client.request('post_auth_email_verifications_type_confirm', ...args);
    },
    put_auth_password: (...args: RequestArguments<'put_auth_password'>) => {
      return client.request('put_auth_password', ...args);
    },
    put_players_id_auth_password: (...args: RequestArguments<'put_players_id_auth_password'>) => {
      return client.request('put_players_id_auth_password', ...args);
    },
    get_auth_profile: (...args: RequestArguments<'get_auth_profile'>) => {
      return client.request('get_auth_profile', ...args);
    },
    delete_auth_sessions_sessionId: (...args: RequestArguments<'delete_auth_sessions_sessionId'>) => {
      return client.request('delete_auth_sessions_sessionId', ...args);
    },
    post_auth_sessions_revoke_others: (...args: RequestArguments<'post_auth_sessions_revoke_others'>) => {
      return client.request('post_auth_sessions_revoke_others', ...args);
    },
    post_players_id_auth_temporary_password: (...args: RequestArguments<'post_players_id_auth_temporary_password'>) => {
      return client.request('post_players_id_auth_temporary_password', ...args);
    },
    post_auth_login: (...args: RequestArguments<'post_auth_login'>) => {
      return client.request('post_auth_login', ...args);
    },
    post_auth_refresh: (...args: RequestArguments<'post_auth_refresh'>) => {
      return client.request('post_auth_refresh', ...args);
    },
    post_auth_logout: (...args: RequestArguments<'post_auth_logout'>) => {
      return client.request('post_auth_logout', ...args);
    },
    get_auth_sessions: (...args: RequestArguments<'get_auth_sessions'>) => {
      return client.request('get_auth_sessions', ...args);
    }
  };
}
