import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parsePositiveIssuedRewards, type IssuedReward } from '../schemas/issued-reward';

export type BackendWeeklyRebateIssued = IssuedReward;

function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('周周返利领取响应不完整');
  }

  return value as Record<string, unknown>;
}

export async function claimBackendWeeklyRebate(
  bid: string,
  uid: number,
  dayIndex: number,
  request?: BackendRequestContext
): Promise<BackendWeeklyRebateIssued[]> {
  if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1 || !Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > 8) {
    throw new Error('周周返利领取参数无效');
  }
  const data = row(
    await requestBackend(bid, 'post_players_id_recharge_weekly_rebate_dayIndex_claim', { path: { id: uid, dayIndex }, ...writeContext(request) })
  );

  return parseBackendWeeklyRebateIssued(data);
}

export function parseBackendWeeklyRebateIssued(value: unknown): BackendWeeklyRebateIssued[] {
  return parsePositiveIssuedRewards(row(value).issued, '周周返利领取响应不完整');
}

export function parseRobotWeeklyRebateClaim(value: unknown) {
  const data = row(value);

  if (!Number.isSafeInteger(data.dayIndex) || Number(data.dayIndex) < 1 || Number(data.dayIndex) > 8) {
    throw new Error('周周返利领取响应不完整');
  }

  return { dayIndex: data.dayIndex as number, issued: parseBackendWeeklyRebateIssued(data) };
}
