import type { NotificationHistoryQueryData } from '../schemas/notification-history-query';
import { requestBackend } from './client';

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

export async function getBackendNotificationHistory(bid: string | undefined, uid: number, page: number): Promise<NotificationHistoryQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  const data: unknown = await requestBackend(bid, 'get_players_id_notifications', { path: { id: uid }, query: { page } });

  return parseNotificationHistory(data, page);
}

export function parseNotificationHistory(data: unknown, page: number): NotificationHistoryQueryData {
  if (
    !record(data) ||
    !Number.isSafeInteger(data.page) ||
    data.page !== page ||
    typeof data.hasNext !== 'boolean' ||
    !Array.isArray(data.items) ||
    data.items.length > 5 ||
    data.items.some(
      item => !record(item) || typeof item.id !== 'string' || !date(item.time) || typeof item.text !== 'string' || typeof item.delivery !== 'string'
    )
  ) {
    throw new Error('通知记录接口数据不完整');
  }

  return data as unknown as NotificationHistoryQueryData;
}
