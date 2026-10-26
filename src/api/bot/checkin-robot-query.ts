export { parseCheckInHub } from './checkin-hub';
export type RobotNewcomerLogin =
  { code: 'ALL_CLAIMED' } | { code: 'NO_CLAIMABLE' } | { code: 'OK'; data: { claimDay: number; spiritCrystal: number; grantedItems: string[] } };
export function parseRobotNewcomerLogin(value: unknown): RobotNewcomerLogin {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('新人登录领奖响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.code === 'ALL_CLAIMED' || row.code === 'NO_CLAIMABLE') {
    return { code: row.code };
  }
  if (row.code !== 'OK' || !row.data || typeof row.data !== 'object' || Array.isArray(row.data)) {
    throw new Error('新人登录领奖响应不完整');
  }
  const d = row.data as Record<string, unknown>;

  if (
    typeof d.claimDay !== 'number' ||
    !Number.isSafeInteger(d.claimDay) ||
    d.claimDay < 1 ||
    d.claimDay > 7 ||
    typeof d.spiritCrystal !== 'number' ||
    !Number.isSafeInteger(d.spiritCrystal) ||
    d.spiritCrystal < 0 ||
    !Array.isArray(d.grantedItems) ||
    !d.grantedItems.every(v => typeof v === 'string')
  ) {
    throw new Error('新人登录领奖响应不完整');
  }

  return { code: 'OK', data: { claimDay: d.claimDay, spiritCrystal: d.spiritCrystal, grantedItems: d.grantedItems } };
}
