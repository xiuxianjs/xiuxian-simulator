import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parsePositiveIssuedRewards, type IssuedReward } from '../schemas/issued-reward';
import { WEEKLY_CUMULATIVE_MODE, WEEKLY_CUMULATIVE_RULES, WEEKLY_CUMULATIVE_THRESHOLDS } from '../schemas/weekly-rebate-query';
import { weeklyRebateWeekStart } from './weekly-rebate-queries';

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
  request?: BackendRequestContext,
  expectedWeekStart?: string
): Promise<BackendWeeklyRebateIssued[]> {
  const cumulative = WEEKLY_CUMULATIVE_THRESHOLDS.some(tier => tier === dayIndex);

  if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1 || !Number.isInteger(dayIndex) || (!cumulative && (dayIndex < 1 || dayIndex > 8))) {
    throw new Error('周周返利领取参数无效');
  }
  const body = cumulative ? { expectedWeekStart: weeklyRebateWeekStart(expectedWeekStart) } : undefined;
  const data = row(
    await requestBackend(bid, 'post_players_id_recharge_weekly_rebate_dayIndex_claim', {
      path: { id: uid, dayIndex },
      ...(body ? { body } : {}),
      ...writeContext(request)
    })
  );

  return parseBackendWeeklyRebateIssued(data);
}

export function parseBackendWeeklyRebateIssued(value: unknown): BackendWeeklyRebateIssued[] {
  return parsePositiveIssuedRewards(row(value).issued, '周周返利领取响应不完整');
}

type CumulativeWeeklyRebateClaimBase = {
  mode: typeof WEEKLY_CUMULATIVE_MODE;
  rulesVersion: typeof WEEKLY_CUMULATIVE_RULES;
  weekStart: string;
  thresholdAmount: number;
  thresholdYuan: number;
  label: string;
  delivery?: 'inventory' | 'mail';
  issued: BackendWeeklyRebateIssued[];
};

export type WeeklyRebateClaimData =
  | { mode?: undefined; dayIndex: number; issued: BackendWeeklyRebateIssued[] }
  | (CumulativeWeeklyRebateClaimBase & ({ kind: 'tier' } | { kind: 'loop'; fromCount: number; toCount: number; claimedCount: number }));

export async function claimBackendWeeklyRebateLoop(
  bid: string,
  uid: number,
  expectedWeekStart: string,
  expectedLoopCount: number,
  request?: BackendRequestContext
): Promise<WeeklyRebateClaimData> {
  if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1 || !Number.isSafeInteger(expectedLoopCount) || expectedLoopCount < 1) {
    throw new Error('周周返利循环领取参数无效');
  }

  return parseRobotWeeklyRebateClaim(
    await requestBackend(bid, 'post_players_id_recharge_weekly_rebate_loop_claim', {
      path: { id: uid },
      body: { expectedWeekStart: weeklyRebateWeekStart(expectedWeekStart), expectedLoopCount },
      ...writeContext(request)
    })
  );
}

export function parseRobotWeeklyRebateClaim(value: unknown): WeeklyRebateClaimData {
  const data = row(value);

  if (data.mode === WEEKLY_CUMULATIVE_MODE) {
    if (data.rulesVersion !== WEEKLY_CUMULATIVE_RULES || typeof data.label !== 'string' || !data.label.trim()) {
      throw new Error('周周返利领取响应不完整');
    }
    if (data.delivery !== undefined && data.delivery !== 'inventory' && data.delivery !== 'mail') {
      throw new Error('周周返利发放方式响应不完整');
    }
    const common: CumulativeWeeklyRebateClaimBase = {
      mode: WEEKLY_CUMULATIVE_MODE,
      rulesVersion: WEEKLY_CUMULATIVE_RULES,
      weekStart: weeklyRebateWeekStart(data.weekStart),
      thresholdAmount: data.thresholdAmount as number,
      thresholdYuan: data.thresholdYuan as number,
      label: data.label,
      issued: parseBackendWeeklyRebateIssued(data)
    };

    if (data.delivery !== undefined) {
      common.delivery = data.delivery;
    }

    if (data.kind === 'loop') {
      if (
        !Number.isSafeInteger(data.thresholdAmount) ||
        Number(data.thresholdAmount) < 64800 ||
        data.thresholdYuan !== Number(data.thresholdAmount) / 100 ||
        !Number.isSafeInteger(data.fromCount) ||
        Number(data.fromCount) < 0 ||
        !Number.isSafeInteger(data.toCount) ||
        Number(data.toCount) < 0 ||
        !Number.isSafeInteger(data.claimedCount) ||
        Number(data.claimedCount) < 0
      ) {
        throw new Error('周周返利循环领取响应不完整');
      }

      return {
        ...common,
        kind: 'loop' as const,
        fromCount: data.fromCount as number,
        toCount: data.toCount as number,
        claimedCount: data.claimedCount as number
      };
    }
    if (
      data.kind !== 'tier' ||
      !WEEKLY_CUMULATIVE_THRESHOLDS.some(tier => tier === data.thresholdYuan) ||
      data.thresholdAmount !== Number(data.thresholdYuan) * 100
    ) {
      throw new Error('周周返利领取档位响应不完整');
    }

    return { ...common, kind: 'tier' as const };
  }
  if (data.mode !== undefined) {
    throw new Error('周周返利领取模式尚未支持');
  }

  if (!Number.isSafeInteger(data.dayIndex) || Number(data.dayIndex) < 1 || Number(data.dayIndex) > 8) {
    throw new Error('周周返利领取响应不完整');
  }

  return { dayIndex: data.dayIndex as number, issued: parseBackendWeeklyRebateIssued(data) };
}
