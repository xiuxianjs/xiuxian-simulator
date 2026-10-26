// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { NotificationsOperations } from './types.js';
export { notificationsOperationDefinitions } from './operations.js';

export function createNotificationsApi(client: APIClient) {
  return {
    get_players_id_notifications_group_subscription: (...args: RequestArguments<'get_players_id_notifications_group_subscription'>) => {
      return client.request('get_players_id_notifications_group_subscription', ...args);
    },
    get_players_id_notifications: (...args: RequestArguments<'get_players_id_notifications'>) => {
      return client.request('get_players_id_notifications', ...args);
    },
    get_players_id_notification_subscription: (...args: RequestArguments<'get_players_id_notification_subscription'>) => {
      return client.request('get_players_id_notification_subscription', ...args);
    },
    put_players_id_notification_subscription: (...args: RequestArguments<'put_players_id_notification_subscription'>) => {
      return client.request('put_players_id_notification_subscription', ...args);
    },
    delete_players_id_notification_subscription: (...args: RequestArguments<'delete_players_id_notification_subscription'>) => {
      return client.request('delete_players_id_notification_subscription', ...args);
    }
  };
}
