import { BackendAPIError } from './client';

export type AchievementLockedResult = { code: 'LOCKED'; data: { realmName: string } };
export type GuardedAchievementData<T> = { locked: true; realmName: string } | { locked: false; data: T };

export function validateGuardedAchievement<T>(value: unknown, decode: (data: unknown) => T): GuardedAchievementData<T> {
  const row = value as Record<string, unknown> | null;
  const access = row?.access as Record<string, unknown> | undefined;

  if (
    !row ||
    typeof row !== 'object' ||
    Array.isArray(row) ||
    !access ||
    typeof access !== 'object' ||
    typeof access.canUseFifthLayerFeature !== 'boolean' ||
    typeof access.realmName !== 'string'
  ) {
    throw new BackendAPIError('成就资格响应不完整', 'SDK_INVALID_RESPONSE');
  }
  if (!access.canUseFifthLayerFeature) {
    if (row.data !== null) {
      throw new BackendAPIError('成就资格响应矛盾', 'SDK_INVALID_RESPONSE');
    }

    return { locked: true, realmName: access.realmName };
  }

  return { locked: false, data: decode(row.data) };
}
