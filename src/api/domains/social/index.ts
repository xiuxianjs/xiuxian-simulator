// Contract synchronized with Go docs/openapi.yaml.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { SocialOperations } from './types.js';
export { socialOperationDefinitions } from './operations.js';

export function createSocialApi(client: APIClient) {
  return {
    post_players_id_flymail_mute_command: (...args: RequestArguments<'post_players_id_flymail_mute_command'>) => client.request('post_players_id_flymail_mute_command', ...args),
    post_players_id_friends_workflow: (...args: RequestArguments<'post_players_id_friends_workflow'>) => client.request('post_players_id_friends_workflow', ...args),
    post_players_id_friend_requests_requestId_reject: (...args: RequestArguments<'post_players_id_friend_requests_requestId_reject'>) => {
      return client.request('post_players_id_friend_requests_requestId_reject', ...args);
    },
    get_players_id_friends_removal_target: (...args: RequestArguments<'get_players_id_friends_removal_target'>) => client.request('get_players_id_friends_removal_target', ...args),
    get_players_id_friend_request_preference: (...args: RequestArguments<'get_players_id_friend_request_preference'>) => client.request('get_players_id_friend_request_preference', ...args),
    patch_players_id_friend_request_preference: (...args: RequestArguments<'patch_players_id_friend_request_preference'>) => client.request('patch_players_id_friend_request_preference', ...args),
    post_players_id_blocklist_removal: (...args: RequestArguments<'post_players_id_blocklist_removal'>) => client.request('post_players_id_blocklist_removal', ...args),
    get_players_id_friends_random: (...args: RequestArguments<'get_players_id_friends_random'>) => client.request('get_players_id_friends_random', ...args),
    get_players_id_social_access: (...args: RequestArguments<'get_players_id_social_access'>) => client.request('get_players_id_social_access', ...args),
    get_players_id_friends: (...args: RequestArguments<'get_players_id_friends'>) => {
      return client.request('get_players_id_friends', ...args);
    },
    get_players_id_friend_requests: (...args: RequestArguments<'get_players_id_friend_requests'>) => {
      return client.request('get_players_id_friend_requests', ...args);
    },
    post_players_id_friend_requests: (...args: RequestArguments<'post_players_id_friend_requests'>) => {
      return client.request('post_players_id_friend_requests', ...args);
    },
    post_players_id_friend_requests_requestId_accept: (...args: RequestArguments<'post_players_id_friend_requests_requestId_accept'>) => {
      return client.request('post_players_id_friend_requests_requestId_accept', ...args);
    },
    delete_players_id_friends_friendId: (...args: RequestArguments<'delete_players_id_friends_friendId'>) => {
      return client.request('delete_players_id_friends_friendId', ...args);
    },
    get_players_id_blocklist: (...args: RequestArguments<'get_players_id_blocklist'>) => {
      return client.request('get_players_id_blocklist', ...args);
    },
    post_players_id_blocklist: (...args: RequestArguments<'post_players_id_blocklist'>) => {
      return client.request('post_players_id_blocklist', ...args);
    },
    delete_players_id_blocklist_blockedUserId: (...args: RequestArguments<'delete_players_id_blocklist_blockedUserId'>) => {
      return client.request('delete_players_id_blocklist_blockedUserId', ...args);
    }
  };
}
