import { validateSettingsOverview } from './player-overview';
import type { NotificationGroupSnapshot } from './notification-cache';
import { BackendAPIError } from './client';

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateRobotSettingsOverview(value: unknown) {
  const invalid = (): never => {
    throw new BackendAPIError('设置聚合响应不完整', 'SDK_INVALID_RESPONSE');
  };

  if (
    !record(value) ||
    !Object.hasOwn(value, 'groupSnapshot') ||
    (value.groupSnapshotUnavailable !== undefined && typeof value.groupSnapshotUnavailable !== 'boolean')
  ) {
    return invalid();
  }
  const snapshot = value.groupSnapshot;

  if (snapshot !== null) {
    if (
      !record(snapshot) ||
      snapshot.acquired !== false ||
      typeof snapshot.previous !== 'string' ||
      (snapshot.permission !== null && (!record(snapshot.permission) || !['allowed', 'blocked', 'unknown'].includes(String(snapshot.permission.state)))) ||
      [snapshot.availability, snapshot.member].some(row => row !== null && (!record(row) || typeof row.available !== 'boolean'))
    ) {
      return invalid();
    }
  }

  return {
    ...validateSettingsOverview(value),
    groupSnapshot: snapshot as NotificationGroupSnapshot | null,
    groupSnapshotUnavailable: value.groupSnapshotUnavailable === true
  };
}

export function validateRobotPreference<T>(data: unknown, field: string, expected: boolean | string | number | null, action: T): T {
  if (!record(data) || data[field] !== expected) {
    throw new BackendAPIError('偏好设置响应不完整', 'SDK_INVALID_RESPONSE');
  }

  return action;
}
