// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { MailOperations } from './types.js';
export { mailOperationDefinitions } from './operations.js';

export function createMailApi(client: APIClient) {
  return {
    get_players_id_flymail_mute_context: (...args: RequestArguments<'get_players_id_flymail_mute_context'>) => {
      return client.request('get_players_id_flymail_mute_context', ...args);
    },
    get_players_id_flymail: (...args: RequestArguments<'get_players_id_flymail'>) => {
      return client.request('get_players_id_flymail', ...args);
    },
    post_players_id_flymail: (...args: RequestArguments<'post_players_id_flymail'>) => {
      return client.request('post_players_id_flymail', ...args);
    },
    get_players_id_flymail_mutes: (...args: RequestArguments<'get_players_id_flymail_mutes'>) => {
      return client.request('get_players_id_flymail_mutes', ...args);
    },
    post_players_id_flymail_mutes_targetId: (...args: RequestArguments<'post_players_id_flymail_mutes_targetId'>) => {
      return client.request('post_players_id_flymail_mutes_targetId', ...args);
    },
    delete_players_id_flymail_mutes_targetId: (...args: RequestArguments<'delete_players_id_flymail_mutes_targetId'>) => {
      return client.request('delete_players_id_flymail_mutes_targetId', ...args);
    }
  };
}
