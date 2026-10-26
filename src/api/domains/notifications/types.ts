import type { NotificationHistoryQueryData } from '../../schemas/notification-history-query';
import type { NotificationSubscriptionDisableData } from '../../schemas/group-subscription-disable';
import type { NotificationSubscriptionEnableData } from '../../schemas/group-subscription-enable';
import type { GroupSubscriptionQueryData } from '../../schemas/group-subscription-query';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface NotificationsOperations {
  get_players_id_notifications_group_subscription: {
    path: { id: number };
    query: never;
    headers: never;
    body: never;
    response: GroupSubscriptionQueryData | null;
  };
  get_players_id_notifications: {
    path: { id: number };
    query: { cursor?: string; page?: number; pageSize?: number };
    headers: never;
    body: never;
    response: NotificationHistoryQueryData;
  };
  get_players_id_notification_subscription: { path: { id: number }; query: never; headers: never; body: never; response: unknown };
  put_players_id_notification_subscription: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { platform: string; channelId: string; botId: string | null; targetScope: 'group' | 'channel' };
    response: NotificationSubscriptionEnableData;
  };
  delete_players_id_notification_subscription: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: never;
    response: NotificationSubscriptionDisableData;
  };
}
