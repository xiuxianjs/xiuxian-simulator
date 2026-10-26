import { displayCurrencyText } from '@src/constants/currency';
import { claimBackendWeeklyRebate } from '@src/api/bot/weekly-rebate-claim';
import type { BackendRequestContext } from '@src/api/bot/context';

export type WeeklyRebateClaimResult =
  { code: 'NO_MATCH' } | { code: 'INVALID_DAY' } | { code: 'FAILED'; error: string } | { code: 'SUCCESS'; label: string; rewardText: string };

const DAY_LABELS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日', '满勤大奖'];

export const getWeeklyRebateClaimData = async (
  uid: number,
  bid: string,
  messageText: string,
  request?: BackendRequestContext
): Promise<WeeklyRebateClaimResult> => {
  const match = messageText.trim().match(/周周返利领取\s+(\d+)/);

  if (!match) {
    return { code: 'NO_MATCH' };
  }
  const dayIndex = Number.parseInt(match[1], 10);

  if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > 8) {
    return { code: 'INVALID_DAY' };
  }
  try {
    const issued = await claimBackendWeeklyRebate(bid, uid, dayIndex, request);

    return {
      code: 'SUCCESS',
      label: DAY_LABELS[dayIndex] ?? `第${dayIndex}天`,
      rewardText: issued.length ? issued.map(reward => `${displayCurrencyText(reward.name)}x${reward.amount}`).join('、') : '无'
    };
  } catch (error) {
    return { code: 'FAILED', error: error instanceof Error ? error.message : '领取失败' };
  }
};
