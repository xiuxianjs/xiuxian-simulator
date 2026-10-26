import { measureTransportStage } from '../../utils/transportTiming';
import axios from 'axios';
import { getAppConfig } from '@src/utils/appConfig';
import type { NotificationDelivery, NotificationTarget } from '@src/types/notification';
import { getNotificationBackendConfig, getWorkerBackendConfig } from './config';
import { backendConnectionPools } from './connection-pools';

/**
 * 服务端下发的通知归属：recipientUserId 是游戏内所属玩家，recipientBid 是其平台账号。
 * 机器人投递时以这两个字段为准，不再从事件载荷里推断接收人。
 * 二者缺失只可能来自尚未升级的服务端，此时调用方退回旧载荷字段。
 */
export type FlyMailDeliveryRouting = {
  scope: 'guild' | 'team' | 'master';
  administrator?: { userId: number; bid: string };
  messageId: number;
  members: { userId: number; bid: string }[];
  group?: NotificationTarget;
};

export type NotificationRelayEvent = {
  flymailRouting?: FlyMailDeliveryRouting;
  eventId: string;
  eventType: string;
  payload: unknown;
  deliveryAttempts: number;
  recipientUserId?: number;
  recipientBid?: string;
};

/** 投递结果由本层上报给服务端，类型与客户端投递状态机共用同一份定义。 */
export type { NotificationDelivery };

function relayClient() {
  const config = getNotificationBackendConfig();

  return axios.create({
    ...backendConnectionPools,
    baseURL: config.url,
    timeout: config.timeoutMs,
    headers: config.headers,
    ...(config.channelMode ? { maxRedirects: 0 } : {})
  });
}
async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await relayClient().post<{ data: T }>(`/api/v1/internal/notification-relay${path}`, body);

  return response.data.data;
}
export async function claimNotificationRelay(eventType: string, consumer: string, lane?: 'flymail' | 'standard'): Promise<NotificationRelayEvent | null> {
  const data = await post<{ event: NotificationRelayEvent | null }>('/claim', { eventType, consumer, ...(lane ? { lane } : {}) });

  return data.event;
}
export async function acknowledgeNotificationRelay(eventId: string, consumer: string, delivery: NotificationDelivery): Promise<void> {
  await post('/ack', { eventId, consumer, delivery });
}
export async function retryNotificationRelay(eventId: string, consumer: string, error: unknown): Promise<void> {
  await post('/retry', { eventId, consumer, error: error instanceof Error ? error.message : String(error) });
}
export async function archiveNotificationRelay(bid: string, key: string, data: unknown): Promise<void> {
  await post('/archive', { bid, key, data });
}

/**
 * 登记平台地址及其所属玩家，供 Go 认领旧消息池时确定通知归属。
 * playerId 是机器人已解析出的游戏玩家 ID；未知时省略，服务端回退到账号匹配。
 */
export async function registerNotificationRecipient(
  uid?: string,
  cid?: string,
  playerId?: number,
  traceEvent?: Parameters<typeof measureTransportStage>[2]
): Promise<void> {
  if (!uid && !cid) {
    return;
  }
  const owner = Number.isSafeInteger(playerId) && (playerId as number) > 0 ? (playerId as number) : undefined;

  await measureTransportStage(
    'notification.recipient',
    () => post('/recipient', {
        botId: notificationBotId(),
        uid: uid ?? '',
        cid: cid ?? '',
        ...(owner === undefined ? {} : { playerId: owner })
      }),
    traceEvent
  );
}

const notificationBotId = (): string => {
  const config = getNotificationBackendConfig();

  return config.channelMode ? config.channelBotId : String(getAppConfig()?.botId ?? 'xiuxian');
};

export async function getLegacySentNotificationIDs(): Promise<Set<string>> {
  const data = await post<{ ids: unknown }>('/legacy-sent-ids', { botId: notificationBotId() });

  if (!data || !Array.isArray(data.ids) || data.ids.some(id => typeof id !== 'string')) {
    throw new Error('旧消息去重回执不完整');
  }

  return new Set(data.ids);
}

export async function markLegacyNotificationSent(messageId: string): Promise<void> {
  await post('/legacy-sent', { botId: notificationBotId(), messageId });
}

/** When Node owns the schedule, it triggers the same Go scanner the autonomous Worker uses. */
export async function scanLegacyNotificationPool(): Promise<void> {
  getWorkerBackendConfig();
  await relayClient().post('/api/v1/internal/workers/push-message-relay/run', {});
}

export type NotificationSubscriptionTarget = {
  platform: string;
  channelId: string;
  botId: string | null;
  targetScope: 'group' | 'channel';
  isEnabled: boolean;
  failureCount: number;
  lastDeliveryAt: string | null;
  lastError: string | null;
};

export async function getNotificationSubscriptionTarget(playerId: number): Promise<NotificationSubscriptionTarget | null> {
  const data = await post<NotificationSubscriptionTarget | null>('/subscription', { playerId });

  if (data === null) {
    return null;
  }
  if (
    !data ||
    typeof data.platform !== 'string' ||
    typeof data.channelId !== 'string' ||
    !['group', 'channel'].includes(data.targetScope) ||
    typeof data.isEnabled !== 'boolean' ||
    !Number.isSafeInteger(data.failureCount) ||
    ![data.botId, data.lastDeliveryAt, data.lastError].every(value => value === null || typeof value === 'string')
  ) {
    throw new Error('通知订阅目标数据不完整');
  }

  return data;
}

export async function recordNotificationSubscriptionDelivery(playerId: number, target: NotificationSubscriptionTarget, failure?: string): Promise<void> {
  await post('/subscription/receipt', { playerId, target, failure: failure ?? null });
}
