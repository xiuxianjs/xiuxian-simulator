import type { ActionTarget, DataEnums } from 'alemonjs';

/** 平台通知目标；scope/targetId 由平台事件或服务端缓存提供。 */
export type NotificationTarget = ActionTarget & { platform: string };

export type PermissionState = {
  state: 'allowed' | 'blocked' | 'unknown';
  source: 'event' | 'query' | 'receipt';
  updatedAt: number;
  retryAt?: number;
  timeUnknown?: boolean;
};

/**
 * 一次投递的结果路由。`history` 表示未发出但已保留站内记录，
 * 与平台发送失败（抛错重试）语义不同。
 */
export type NotificationDelivery = {
  route: 'group' | 'private' | 'history';
  /** Organization fanout failures, reported to Go for one durable administrator warning. */
  unreachableUserIds?: number[];
  subscriptionRequired?: boolean;
  reason: 'sent' | 'reminded' | 'proactive_disabled' | 'permission_blocked' | 'no_private_target' | 'no_target';
};

/** 平台通道能力：读取权限、发送、失败后复查权限、记录失败。 */
export interface NotificationChannel {
  read(target: NotificationTarget): Promise<PermissionState | null>;
  send(target: NotificationTarget, data: DataEnums[], previous: PermissionState | null): Promise<void>;
  refreshAfterFailure(target: NotificationTarget): Promise<PermissionState | null>;
  recordFailure(target: NotificationTarget): Promise<void>;
}

/** The platform may have accepted this send; switching groups could duplicate it. */
export class NotificationDeliveryUncertainError extends Error {}

/** Another process owns this shared delivery; wait without switching targets. */
export class NotificationDeliveryPendingError extends Error {}
