import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parseBackendMonthCardDailyRewards, parseMonthCardClaimResult } from './month-card-daily-rewards';
import { parsePositiveIssuedRewards } from '../schemas/issued-reward';
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export async function claimBackendMonthCardOverview(bid: string | undefined, uid: number, request?: BackendRequestContext) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_recharge_month_card_daily_rewards_claim_overview', {
    path: { id: uid },
    headers: repeatPresentationHeaders('月卡领取'),
    ...writeContext(request)
  });

  return parseBackendMonthCardOverview(data);
}

export function parseBackendMonthCardOverview(data: unknown) {
  if (
    !record(data) ||
    typeof data.beforeTotal !== 'number' ||
    !Number.isSafeInteger(data.beforeTotal) ||
    data.beforeTotal < 0 ||
    (data.statusError !== undefined && typeof data.statusError !== 'string')
  ) {
    throw new Error('月卡每日奖励响应不完整');
  }

  return {
    beforeTotal: data.beforeTotal,
    claim: data.claim === null ? null : parseMonthCardClaimResult(data.claim),
    status: data.status === null ? null : parseBackendMonthCardDailyRewards(data.status),
    statusError: data.statusError
  };
}
export async function claimBackendFirstRechargeOverview(bid: string, uid: number, tierAmount: number, request?: BackendRequestContext) {
  const data = await requestBackend(bid, 'post_players_id_recharge_first_tiers_tierAmount_claim_overview', {
    path: { id: uid, tierAmount },
    headers: repeatPresentationHeaders('领取礼包奖励'),
    ...writeContext(request)
  });

  return parseBackendFirstRechargeOverview(data);
}

export function parseBackendFirstRechargeOverview(data: unknown) {
  if (
    !record(data) ||
    !Array.isArray(data.validTiers) ||
    !data.validTiers.every(Number.isFinite) ||
    typeof data.validTier !== 'boolean' ||
    (data.claimError !== undefined && typeof data.claimError !== 'string')
  ) {
    throw new Error('首充领取响应不完整');
  }
  const row = data as Record<string, unknown> & { validTiers: number[]; validTier: boolean; claimError?: string; result: unknown };

  if (row.result !== null) {
    if (!record(row.result)) {
      throw new Error('首充领取响应不完整');
    }
    // Empty or "null" reward configuration produces a nil Go slice.

    const issued = parsePositiveIssuedRewards(row.result.issued === null ? [] : row.result.issued, '首充领取响应不完整');

    return { ...row, result: { ...row.result, issued } };
  }

  return { ...row, result: null };
}
