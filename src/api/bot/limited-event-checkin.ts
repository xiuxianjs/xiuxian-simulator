import { parsePositiveIssuedRewards, type IssuedReward } from '../schemas/issued-reward';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type LimitedEventCheckinIssuedReward = IssuedReward;
export type LimitedEventCheckinResult = {
  results: Array<{ eventTitle: string; subTitle: string; dayIndex: number; issued: LimitedEventCheckinIssuedReward[] }>;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('活动签到响应不完整');
  }

  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error('活动签到响应不完整');
  }

  return value;
}

function issuedRewards(value: unknown): LimitedEventCheckinIssuedReward[] {
  return parsePositiveIssuedRewards(value, '活动签到响应不完整', '活动签到奖励响应不完整');
}

export async function postBackendLimitedEventCheckin(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext
): Promise<LimitedEventCheckinResult> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('活动签到参数无效');
  }

  const result = record(
    await requestBackend(bid, 'post_players_id_limited_events_check_in', {
      path: { id: uid },
      ...writeContext(request)
    })
  );

  return parseLimitedEventCheckin(result);
}
export function parseLimitedEventCheckin(value: unknown): LimitedEventCheckinResult {
  const result = record(value);

  if (!Array.isArray(result.results)) {
    throw new Error('活动签到响应不完整');
  }

  return {
    results: result.results.map(value => {
      const row = record(value);

      if (typeof row.eventTitle !== 'string' || typeof row.subTitle !== 'string') {
        throw new Error('活动签到响应不完整');
      }

      return { eventTitle: row.eventTitle, subTitle: row.subTitle, dayIndex: positiveInteger(row.dayIndex), issued: issuedRewards(row.issued) };
    })
  };
}
