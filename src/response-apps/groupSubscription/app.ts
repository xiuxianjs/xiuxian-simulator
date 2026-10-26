import { enableBackendGroupSubscription, type GroupSubscriptionTargetScope } from '@src/api/bot/group-subscription-enable';
import type { BackendRequestContext } from '@src/api/bot/context';

export async function enableSubscription(
  bid: string | undefined,
  userId: number,
  platform: string,
  channelId: string,
  botId: string | undefined,
  targetScope: GroupSubscriptionTargetScope,
  request: BackendRequestContext
) {
  return await enableBackendGroupSubscription(bid, userId, { platform, channelId, botId, targetScope }, request);
}
