import { observeBackendRequest } from './backend-availability';
import { isRetryableNotificationRequestError, notificationRequestContext, notificationRequestError } from './notification-error';
import type { NotificationDelivery, NotificationTarget, PermissionState } from '@src/types/notification';
import axios from 'axios';
import { getNotificationBackendConfig } from './config';
import { backendConnectionPools } from './connection-pools';
import { randomUUID } from 'node:crypto';
import { logger } from 'alemonjs';
import { communityClaimReceipt, type CommunityClaimRequest } from '@src/notification/communityClaimReceipt';

function cacheClient() {
  const config = getNotificationBackendConfig();
  const context = notificationRequestContext(config.timeoutMs);

  const client = axios.create({
    ...backendConnectionPools,
    baseURL: config.url,
    timeout: config.timeoutMs,
    headers: config.headers,
    ...(config.channelMode ? { maxRedirects: 0 } : {})
  });

  return { client, context, config };
}

async function post<T>(path: string, body: unknown, trackAvailability = true): Promise<T> {
  const { client, context, config } = cacheClient();
  const endpoint = `${config.apiBase}/v1/internal/notification-relay/cache${path}`;

  try {
    const send = () => client.post<{ data: T }>(endpoint, body, { headers: { 'X-Request-ID': context.requestId } });
    const response = trackAvailability ? await observeBackendRequest(config, send) : await send();

    return response.data.data;
  } catch (error) {
    throw notificationRequestError(endpoint, error, context);
  }
}

export async function readPlatformPermission(target: NotificationTarget): Promise<{ state: PermissionState | null; raw: string }> {
  return await post('/permission/read', { target });
}

export async function acquirePlatformPermissionProbe(target: NotificationTarget): Promise<{ previous: string; acquired: boolean }> {
  return await post('/permission/probe', { target });
}

export async function compareAndSetPlatformPermission(target: NotificationTarget, previous: string, state: PermissionState, ttlSeconds: number): Promise<void> {
  await post('/permission/cas', { target, previous, state, ttlSeconds });
}

export async function recordPlatformPermissionFailure(target: NotificationTarget): Promise<void> {
  await post('/permission/failure', { target });
}

export async function recordPlatformPermissionEvent(target: NotificationTarget, enabled: boolean, occurredAt: number, observedOnly = false): Promise<void> {
  const receipt = await post<{ ok: boolean }>('/permission/event', { target, enabled, occurredAt, observedOnly });

  requireObservationReceipt(receipt);
}

export async function rememberPlatformPrivateTarget(platform: string, bid: string, target: NotificationTarget, observedAt?: number): Promise<void> {
  await post('/private-target/remember', { platform, bid, target, observedAt });
}

export async function observePlatformPrivateTarget(platform: string, bid: string, target: NotificationTarget, observedAt: number): Promise<void> {
  // Older servers can return 404 during rollout. Only this replay should wait.
  const receipt = await post<{ ok: boolean }>('/private-target/observe', { platform, bid, target, observedAt }, false);

  requireObservationReceipt(receipt);
}

export async function readPlatformPrivateTarget(platform: string, bid: string, botId?: string): Promise<NotificationTarget | null> {
  return await post('/private-target/read', { platform, bid, botId: botId ?? '' });
}

export async function readPlatformDeliveryReceipt(eventId: string): Promise<NotificationDelivery | null> {
  return await post('/receipt/read', { eventId });
}

export async function storePlatformDeliveryReceipt(eventId: string, receipt: NotificationDelivery): Promise<void> {
  await post('/receipt/store', { eventId, receipt });
}

export type NotificationAvailability = { available: boolean; updatedAt: number; timeUnknown?: boolean };
export async function readPlatformAvailability(target: NotificationTarget, memberId = ''): Promise<NotificationAvailability | null> {
  return await post('/availability/read', { target, memberId });
}

export const memberAvailabilityBatchSize = 64;

export class NotificationMemberAvailabilityUnavailableError extends Error {}

export async function readPlatformMemberAvailability(target: NotificationTarget, memberIds: string[]): Promise<boolean[] | null> {
  const result = await post<unknown>('/availability/read', { target, memberIds });

  // Older servers ignore memberIds and return only the group observation.
  if (
    result === null ||
    (typeof result === 'object' &&
      result !== null &&
      'available' in result &&
      typeof result.available === 'boolean' &&
      'updatedAt' in result &&
      typeof result.updatedAt === 'number' &&
      !('memberAvailability' in result))
  ) {
    return null;
  }
  if (typeof result === 'object' && result !== null && 'memberAvailability' in result) {
    const flags = result.memberAvailability;

    if (Array.isArray(flags) && flags.length === memberIds.length && flags.every(flag => typeof flag === 'boolean')) {
      return flags;
    }
  }
  throw new NotificationMemberAvailabilityUnavailableError('群成员状态响应不完整');
}

export async function recordPlatformAvailability(
  target: NotificationTarget,
  available: boolean,
  occurredAt: number,
  memberId = '',
  observedOnly = false
): Promise<void> {
  const receipt = await post<{ ok: boolean }>('/availability/event', { target, memberId, available, occurredAt, observedOnly });

  requireObservationReceipt(receipt);
}

function requireObservationReceipt(receipt: { ok: boolean }): void {
  if (receipt?.ok !== true) {
    const error = new Error('通知平台事件未收到有效的保存回执');

    error.name = 'NotificationRequestError';
    throw error;
  }
}

export type CommunitySettings = {
  failedBatches?: number;
  welcomeEnabled: boolean;
  requestReminders: boolean;
  shopRaidEnabled?: boolean;
  updatedBy?: string;
  updatedAt?: number;
};
export type CommunityJoinRequest = { id: string; userId: string; userName: string; appliedAt: string; autoApproved: boolean; observedAt: number };
export async function readCommunitySettings(target: NotificationTarget): Promise<CommunitySettings> {
  return await post('/community/settings/read', { target });
}
export async function writeCommunitySettings(target: NotificationTarget, settings: CommunitySettings): Promise<void> {
  await post('/community/settings/write', { target, settings });
}
export async function recordCommunityJoinRequest(target: NotificationTarget, request: CommunityJoinRequest): Promise<{ inserted: boolean }> {
  const receipt = await post<{ inserted: boolean }>('/community/requests/record', { target, request });

  requireObservationReceipt({ ok: typeof receipt?.inserted === 'boolean' });

  return receipt;
}
export async function listCommunityJoinRequests(target: NotificationTarget, page: number): Promise<{ items: CommunityJoinRequest[]; hasNext: boolean }> {
  return await post('/community/requests/list', { target, page });
}

export async function acquireFlyMailGroupReminder(platform: string, bid: string): Promise<boolean> {
  const result = await post<{ acquired: boolean }>('/flymail/reminder/acquire', { eventId: JSON.stringify([platform, bid]) });

  return result.acquired;
}

export async function acquirePlatformDeliveryLease(eventId: string, consumer: string): Promise<boolean> {
  const result = await post<{ acquired: boolean }>('/receipt/lease/acquire', { eventId, consumer });

  return result.acquired;
}

type CommunityConvoy = {
  id: number;
  departureAt: string;
  nextGuardSeat?: number;
  noPaidGuard?: boolean;
  manifest: { name?: string; templateId?: number; currency?: string; effectCode?: string; quantity: number }[];
};
export type CommunityBatch = { eventId: string; target: NotificationTarget; items: string[] } & (
  { kind: 'welcome' | 'request' } | { kind: 'shop-raid'; convoy: CommunityConvoy }
);
export async function queueCommunityNotification(
  target: NotificationTarget,
  kind: 'welcome' | 'request',
  itemId: string,
  occurredAt: number,
  memberObservedAt?: number
): Promise<void> {
  const receipt = await post<{ ok: boolean }>('/community/queue', {
    target,
    kind,
    itemId,
    occurredAt,
    ...(memberObservedAt === undefined ? {} : { memberObservedAt })
  });

  requireObservationReceipt(receipt);
}
type ClaimedCommunityBatch = { batch: CommunityBatch; consumer: string; clearRecovery?: () => void };

// Match the server's lifetime for a recoverable claim receipt.
const communityClaimReceiptLifetimeMs = 120_000;
const pendingCommunityClaims = new Map<string, { request: CommunityClaimRequest; expiresAt: number }>();

function clearCommunityClaim(key: string, receipt: ReturnType<typeof communityClaimReceipt>, request: CommunityClaimRequest): void {
  if (pendingCommunityClaims.get(key)?.request.requestId === request.requestId) {
    pendingCommunityClaims.delete(key);
  }
  try {
    receipt.clear(request);
  } catch (error) {
    logger.error('清理原群通知领取回执失败', error);
  }
}

async function recoverCommunityClaim(
  key: string,
  receipt: ReturnType<typeof communityClaimReceipt>,
  request: CommunityClaimRequest
): Promise<ClaimedCommunityBatch | null> {
  let batch: CommunityBatch | null;

  try {
    batch = await post<CommunityBatch | null>('/community/claim/recover', request, false);
  } catch (error) {
    if (!isRetryableNotificationRequestError(error)) {
      clearCommunityClaim(key, receipt, request);
    }
    throw error;
  }
  if (batch === null) {
    clearCommunityClaim(key, receipt, request);

    return null;
  }
  if (!batch?.eventId) {
    throw new Error('群通知原领取回执无效');
  }

  return { batch, consumer: request.consumer, clearRecovery: () => clearCommunityClaim(key, receipt, request) };
}

export async function claimCommunityNotification(botId: string): Promise<ClaimedCommunityBatch | null> {
  const scope = getNotificationBackendConfig().notificationQueueScope;
  const key = JSON.stringify([process.cwd(), scope, botId]);
  const receipt = communityClaimReceipt(scope, botId);
  const now = Date.now();

  for (const [pendingKey, claim] of pendingCommunityClaims) {
    if (claim.expiresAt <= now) {
      pendingCommunityClaims.delete(pendingKey);
    }
  }
  let stored: CommunityClaimRequest | null | 'busy' = null;

  try {
    stored = receipt.read();
  } catch (error) {
    logger.error('读取原群通知领取回执失败', error);
  }
  if (stored === 'busy') {
    return null;
  }
  const pending = stored ?? pendingCommunityClaims.get(key)?.request;

  if (pending) {
    const original = await recoverCommunityClaim(key, receipt, pending);

    if (original) {
      return original;
    }
    if (scope !== getNotificationBackendConfig().notificationQueueScope) {
      return null;
    }
  }
  const consumer = `node.community:${randomUUID()}`;
  const request = { botId, consumer, requestId: randomUUID() };
  const expiresAt = Date.now() + communityClaimReceiptLifetimeMs;

  try {
    const batch = await post<CommunityBatch | null>('/community/claim', request);

    return batch ? { batch, consumer } : null;
  } catch (error) {
    if (!isRetryableNotificationRequestError(error)) {
      throw error;
    }
    // Keep the token for the issuing backend even if the failure switched
    // the active route before its read-only recovery call.
    pendingCommunityClaims.set(key, { request, expiresAt });
    try {
      receipt.save(request, expiresAt);
    } catch (saveError) {
      logger.error('保存原群通知领取回执失败', saveError);
    }
    if (scope !== getNotificationBackendConfig().notificationQueueScope) {
      throw error;
    }
    const original = await recoverCommunityClaim(key, receipt, request).catch(() => null);

    if (original) {
      return original;
    }
    throw error;
  }
}
export async function finishCommunityNotification(eventId: string, consumer: string, retry: boolean, deferred: boolean, requestId: string): Promise<void> {
  const receipt = await post<{ ok: boolean }>('/community/finish', { eventId, consumer, retry, deferred, requestId });

  requireObservationReceipt(receipt);
}

export type NotificationGroupSnapshot = {
  permission: PermissionState | null;
  availability: NotificationAvailability | null;
  member: NotificationAvailability | null;
  previous: string;
  acquired: boolean;
};
export async function readNotificationGroupSnapshot(target: NotificationTarget, memberId: string, probe: boolean): Promise<NotificationGroupSnapshot> {
  return await post('/group/snapshot', { target, memberId, probe });
}
export async function refreshNotificationGroupSnapshot(
  target: NotificationTarget,
  memberId: string,
  previous: string,
  state: PermissionState,
  ttlSeconds: number
): Promise<NotificationGroupSnapshot> {
  return await post('/group/refresh', { target, memberId, previous, state, ttlSeconds });
}

export type NotificationCategory = { id: string; label: string; enabled: boolean };

export function playerNotificationCategories(userId: number, category?: string, enabled?: boolean): Promise<NotificationCategory[]> {
  return post('/player/categories', { userId, category, enabled });
}

export async function playerNotificationEnabled(userId: number, source = ''): Promise<boolean> {
  const result = await post<{ enabled: boolean }>('/player/categories', { userId, source });

  return result.enabled;
}
