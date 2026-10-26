import type { NotificationDelivery, NotificationTarget, PermissionState } from '@src/types/notification';
import axios from 'axios';
import { getNotificationBackendConfig } from './config';
import { backendConnectionPools } from './connection-pools';

function cacheClient() {
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
  const response = await cacheClient().post<{ data: T }>(`/api/v1/internal/notification-relay/cache${path}`, body);

  return response.data.data;
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
  await post('/permission/event', { target, enabled, occurredAt, observedOnly });
}

export async function rememberPlatformPrivateTarget(platform: string, bid: string, target: NotificationTarget): Promise<void> {
  await post('/private-target/remember', { platform, bid, target });
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
export async function recordPlatformAvailability(
  target: NotificationTarget,
  available: boolean,
  occurredAt: number,
  memberId = '',
  observedOnly = false
): Promise<void> {
  await post('/availability/event', { target, memberId, available, occurredAt, observedOnly });
}

export type CommunitySettings = { failedBatches?: number; welcomeEnabled: boolean; requestReminders: boolean; updatedBy?: string; updatedAt?: number };
export type CommunityJoinRequest = { id: string; userId: string; userName: string; appliedAt: string; autoApproved: boolean; observedAt: number };
export async function readCommunitySettings(target: NotificationTarget): Promise<CommunitySettings> {
  return await post('/community/settings/read', { target });
}
export async function writeCommunitySettings(target: NotificationTarget, settings: CommunitySettings): Promise<void> {
  await post('/community/settings/write', { target, settings });
}
export async function recordCommunityJoinRequest(target: NotificationTarget, request: CommunityJoinRequest): Promise<{ inserted: boolean }> {
  return await post('/community/requests/record', { target, request });
}
export async function listCommunityJoinRequests(target: NotificationTarget, page: number): Promise<{ items: CommunityJoinRequest[]; hasNext: boolean }> {
  return await post('/community/requests/list', { target, page });
}

export async function acquirePlatformDeliveryLease(eventId: string, consumer: string): Promise<boolean> {
  const result = await post<{ acquired: boolean }>('/receipt/lease/acquire', { eventId, consumer });

  return result.acquired;
}

export type CommunityBatch = { eventId: string; target: NotificationTarget; kind: 'welcome' | 'request'; items: string[] };
export async function queueCommunityNotification(target: NotificationTarget, kind: CommunityBatch['kind'], itemId: string, occurredAt: number): Promise<void> {
  await post('/community/queue', { target, kind, itemId, occurredAt });
}
export async function claimCommunityNotification(botId: string, consumer: string): Promise<CommunityBatch | null> {
  return await post('/community/claim', { botId, consumer });
}
export async function finishCommunityNotification(eventId: string, consumer: string, retry: boolean): Promise<void> {
  await post('/community/finish', { eventId, consumer, retry });
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

export type NotificationGroupActivity = { target: NotificationTarget; occurredAt: number };
export async function rememberPlatformGroupActivity(bid: string, activity: NotificationGroupActivity): Promise<void> {
  await post('/activity/remember', { bid, ...activity });
}
export async function readPlatformGroupActivity(platform: string, bid: string, botId = ''): Promise<NotificationGroupActivity | null> {
  return await post('/activity/read', { platform, bid, botId });
}

export async function readPlatformGroupCandidates(platform: string, bid: string, botId = ''): Promise<NotificationGroupActivity[]> {
  return await post('/activity/candidates', { platform, bid, botId });
}

export type NotificationCategory = { id: string; label: string; enabled: boolean };

export function playerNotificationCategories(userId: number, category?: string, enabled?: boolean): Promise<NotificationCategory[]> {
  return post('/player/categories', { userId, category, enabled });
}

export async function playerNotificationEnabled(userId: number, source = ''): Promise<boolean> {
  const result = await post<{ enabled: boolean }>('/player/categories', { userId, source });

  return result.enabled;
}
