import { BackendAPIError } from '@src/api/bot/client';
import { claimBackendNewcomerRechargeDay } from '@src/api/bot/newcomer-recharge-claim';
import type { BackendRequestContext } from '@src/api/bot/context';

export type NewcomerClaimResult =
  | { code: 'NO_MATCH' }
  | { code: 'INVALID_DAY'; maxDays: number }
  | { code: 'NOT_IN_PERIOD' }
  | { code: 'NOT_UNLOCKED'; dayIndex: number }
  | { code: 'INSUFFICIENT_RECHARGE' }
  | { code: 'FAILED'; error: string }
  | { code: 'SUCCESS'; dayIndex: number; rewardText: string };

export const getNewcomerClaimData = async (
  bid: string | undefined,
  uid: number,
  messageText: string,
  request?: BackendRequestContext
): Promise<NewcomerClaimResult> => {
  const match = messageText.trim().match(/新人返利领取\s+(\d+)/);

  if (!match) {
    return { code: 'NO_MATCH' };
  }

  const dayIndex = parseInt(match[1], 10);

  if (isNaN(dayIndex) || dayIndex < 1 || dayIndex > 14) {
    return { code: 'INVALID_DAY', maxDays: 14 };
  }

  try {
    const result = await claimBackendNewcomerRechargeDay(bid, uid, dayIndex, request, messageText);

    return { code: 'SUCCESS', dayIndex: result.dayIndex, rewardText: result.rewardText };
  } catch (error) {
    if (error instanceof BackendAPIError) {
      switch (error.message) {
        case '您已过新人期，无法领取新人狂欢奖励。':
          return { code: 'NOT_IN_PERIOD' };
        case '奖励尚未解锁':
          return { code: 'NOT_UNLOCKED', dayIndex };
        case '今日充值不足':
          return { code: 'INSUFFICIENT_RECHARGE' };
        default:
          return { code: 'FAILED', error: error.message };
      }
    }
    throw error;
  }
};
