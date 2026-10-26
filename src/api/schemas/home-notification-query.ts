/**
 * My-home notification badges. The service fixes the item order to the legacy
 * Node display priority and omits zero-count sources.
 */
export type HomeNotificationType =
  | 'UNREAD_EMAIL'
  | 'PENDING_FRIEND'
  | 'UNREAD_NOTICE'
  | 'PENDING_TEAM'
  | 'PENDING_GUILD'
  | 'PENDING_COMPANION'
  | 'UNREAD_ROBBERY'
  | 'UNREAD_COUNTER_ATTACK'
  | 'ACTIVE_BOUNTY_ON_ME'
  | 'MATURE_CAVE_PLOT'
  | 'KILL_GOD'
  | 'UNREAD_FLYMAIL'
  | 'UNDELIVERED_NOTIFICATION';

export interface HomeNotificationItem {
  type: HomeNotificationType;
  count: number;
}

export type HomeNotificationQueryData = HomeNotificationItem[];
