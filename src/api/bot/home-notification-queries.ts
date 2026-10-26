import type { HomeNotificationQueryData, HomeNotificationType } from '../schemas/home-notification-query';

const orderedTypes: HomeNotificationType[] = [
  'UNREAD_EMAIL',
  'PENDING_FRIEND',
  'UNREAD_NOTICE',
  'PENDING_TEAM',
  'PENDING_GUILD',
  'PENDING_COMPANION',
  'UNREAD_ROBBERY',
  'UNREAD_COUNTER_ATTACK',
  'ACTIVE_BOUNTY_ON_ME',
  'MATURE_CAVE_PLOT',
  'KILL_GOD',
  'UNREAD_FLYMAIL',
  'UNDELIVERED_NOTIFICATION'
];

const types = new Set<HomeNotificationType>(orderedTypes);
const isNotificationType = (value: unknown): value is HomeNotificationType => typeof value === 'string' && types.has(value as HomeNotificationType);

const hasCanonicalOrder = (items: Array<{ type: HomeNotificationType }>) => items.every((item, index) => {
    return index === 0 || orderedTypes.indexOf(items[index - 1].type) < orderedTypes.indexOf(item.type);
  });

export function validateHomeNotifications(data: unknown): HomeNotificationQueryData {
  if (
    !Array.isArray(data) ||
    data.some(item => !item || typeof item !== 'object' || !isNotificationType(item.type) || !Number.isSafeInteger(item.count) || item.count < 1) ||
    !hasCanonicalOrder(data as Array<{ type: HomeNotificationType }>)
  ) {
    throw new Error('主页通知响应不完整');
  }

  return data as HomeNotificationQueryData;
}
