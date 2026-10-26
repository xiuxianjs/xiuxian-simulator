import { displayCurrencyText } from '@src/constants/currency';
import { claimBackendFirstRechargeOverview } from '@src/api/bot/reward-claim-overview';
import type { BackendRequestContext } from '@src/api/bot/context';

export type FirstRechargeClaimResult =
  | { code: 'NO_MATCH' }
  | { code: 'INVALID_TIER'; validTiers: number[] }
  | { code: 'FAILED'; error: string }
  | { code: 'SUCCESS'; tierYuan: number; rewardText: string };

export const getFirstRechargeClaimData = async (
  uid: number,
  bid: string,
  messageText: string,
  request?: BackendRequestContext
): Promise<FirstRechargeClaimResult> => {
  const match = messageText.trim().match(/领取礼包奖励\s+(\d+)/);

  if (!match) {
    return { code: 'NO_MATCH' };
  }
  const tierYuan = Number.parseInt(match[1], 10);
  const overview = await claimBackendFirstRechargeOverview(bid, uid, tierYuan * 100, request);
  const validTiers = overview.validTiers;

  if (!validTiers.includes(tierYuan)) {
    return { code: 'INVALID_TIER', validTiers };
  }
  try {
    if (overview.claimError) {
      return { code: 'FAILED', error: overview.claimError };
    }
    const issued = overview.result?.issued;

    if (!issued) {
      throw new Error('首充领取响应不完整');
    }

    return {
      code: 'SUCCESS',
      tierYuan,
      rewardText: issued.length ? issued.map(reward => `${displayCurrencyText(reward.name)}x${reward.amount}`).join('、') : '无'
    };
  } catch (error) {
    return { code: 'FAILED', error: error instanceof Error ? error.message : '领取失败' };
  }
};
