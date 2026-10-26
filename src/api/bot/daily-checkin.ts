import { repeatPresentationHeaders } from './repeat-presentation';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import { parsePositiveIssuedRewards } from '../schemas/issued-reward';

type DailyCheckInResult = {
  dateIssued?: Array<{ name: string; amount: number }>;
  accumulatedIssued?: Array<{ name: string; amount: number }>;
  progressText?: string;
  titleMessage?: string;
  ritualText: string;
  accumulatedDays: number;
  issued: Array<{ name: string; amount: number }>;
};

export async function dailyBackendCheckIn(bid: string, uid: number, request?: BackendRequestContext, repeatCommand?: string): Promise<DailyCheckInResult> {
  const value = await requestBackend(bid, 'post_players_id_check_ins_scope_with_ritual', {
    path: { id: uid, scope: 'daily' },
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeContext(request)
  });

  return parseDailyCheckIn(value);
}
export function parseDailyCheckIn(value: unknown): DailyCheckInResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('日常签到响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (typeof row.accumulatedDays !== 'number' || !Number.isSafeInteger(row.accumulatedDays) || row.accumulatedDays < 1 || !Array.isArray(row.issued)) {
    throw new Error('日常签到响应不完整');
  }
  const issued = parsePositiveIssuedRewards(row.issued, '日常签到响应不完整').map(({ name, amount }) => ({ name, amount }));

  const title = row.titleReward;
  let titleMessage: string | undefined;

  if (title !== undefined && title !== null) {
    if (typeof title !== 'object' || Array.isArray(title) || typeof (title as Record<string, unknown>).message !== 'string') {
      throw new Error('日常签到称号响应不完整');
    }
    titleMessage = (title as { message: string }).message;
  }

  const groups =
    row.dateIssued !== undefined && row.accumulatedIssued !== undefined
      ? {
          dateIssued: parsePositiveIssuedRewards(row.dateIssued, '日期奖励响应不完整'),
          accumulatedIssued: parsePositiveIssuedRewards(row.accumulatedIssued, '累计奖励响应不完整')
        }
      : {};

  return {
    ...groups,
    progressText: typeof row.progressText === 'string' ? row.progressText : undefined,
    titleMessage,
    ritualText: typeof row.ritualText === 'string' ? row.ritualText : '',
    accumulatedDays: Number(row.accumulatedDays),
    issued
  };
}

type NewcomerCheckInResult = { ritualText: string; accumulatedDays: number; expireDate: string; issued: Array<{ name: string; amount: number }> };

export async function newcomerBackendCheckIn(
  bid: string,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<NewcomerCheckInResult> {
  const value = await requestBackend(bid, 'post_players_id_check_ins_scope_with_ritual', {
    path: { id: uid, scope: 'newcomer' },
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeContext(request)
  });

  return parseNewcomerCheckIn(value);
}
export function parseNewcomerCheckIn(value: unknown): NewcomerCheckInResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('新人签到响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (
    typeof row.accumulatedDays !== 'number' ||
    !Number.isSafeInteger(row.accumulatedDays) ||
    row.accumulatedDays < 1 ||
    typeof row.expireDate !== 'string' ||
    !Array.isArray(row.issued)
  ) {
    throw new Error('新人签到响应不完整');
  }
  const issued = parsePositiveIssuedRewards(row.issued, '新人签到响应不完整').map(({ name, amount }) => ({ name, amount }));

  return {
    ritualText: typeof row.ritualText === 'string' ? row.ritualText : '',
    accumulatedDays: Number(row.accumulatedDays),
    expireDate: row.expireDate,
    issued
  };
}
