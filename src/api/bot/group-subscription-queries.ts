import type { GroupSubscriptionQueryData } from '../schemas/group-subscription-query';

export function validateGroupSubscription(value: unknown): GroupSubscriptionQueryData | null {
  if (value === null) {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('群订阅查询数据不完整');
  }
  const data = value as GroupSubscriptionQueryData;

  if (
    !data ||
    typeof data.platform !== 'string' ||
    typeof data.channelId !== 'string' ||
    !['group', 'channel'].includes(data.targetScope) ||
    typeof data.isEnabled !== 'boolean' ||
    !Number.isFinite(data.failureCount) ||
    ![data.botId, data.lastError, data.lastDeliveryAt].every(x => x === null || typeof x === 'string') ||
    (data.channelState !== null && !['allowed', 'blocked', 'unknown'].includes(data.channelState?.state))
  ) {
    throw new Error('群订阅查询数据不完整');
  }

  return data;
}
