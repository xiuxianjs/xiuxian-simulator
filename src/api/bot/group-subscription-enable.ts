import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type GroupSubscriptionTargetScope = 'group' | 'channel';

export async function enableBackendGroupSubscription(
  bid: string | undefined,
  uid: number,
  target: { platform: string; channelId: string; botId?: string; targetScope: GroupSubscriptionTargetScope },
  request?: BackendRequestContext
): Promise<{ switched: boolean }> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  const context = writeContext(request);
  const data = await requestBackend(bid, 'put_players_id_notification_subscription', {
    path: { id: uid },
    body: {
      platform: target.platform,
      channelId: target.channelId,
      botId: target.botId ?? null,
      targetScope: target.targetScope
    },
    ...context
  });

  if (!data || typeof data !== 'object' || !('switched' in data) || typeof data.switched !== 'boolean') {
    throw new Error('群订阅开启响应不完整');
  }

  return data;
}
