import { BackendAPIError } from '@src/api/bot/client';
import { claimBackendMonthCardOverview } from '@src/api/bot/reward-claim-overview';
import type { BackendRequestContext } from '@src/api/bot/context';
import type { CodeResult } from '@src/types/result';
import { logger } from 'alemonjs';

export type ClaimRewardsData = {
  days: number;
  rewards: {
    spiritCrystal: number;
    huanHunDan: number;
    yangShenDan: number;
  };
  status: {
    claimedCount: number;
    upcomingCount: number;
  };
};

export type ClaimResult = CodeResult<'OK', 'NO_MONTH_CARD' | 'NO_REWARDS' | 'CLAIM_FAILED', ClaimRewardsData>;

export default async function App(params: { bid?: string; uid: number; request?: BackendRequestContext }): Promise<ClaimResult> {
  const { bid, uid, request } = params;

  try {
    const overview = await claimBackendMonthCardOverview(bid, uid, request);

    if (overview.beforeTotal === 0) {
      return { code: 'NO_MONTH_CARD' };
    }

    const result = overview.claim;
    const status = overview.status;

    if (!result || !status) {
      return { code: 'CLAIM_FAILED' };
    }

    return {
      code: 'OK',
      data: {
        days: result.days,
        rewards: {
          spiritCrystal: result.rewards.spiritCrystal,
          huanHunDan: result.rewards.mentalPill,
          yangShenDan: result.rewards.qiPill
        },
        status: {
          claimedCount: status.claimedCount,
          upcomingCount: status.upcomingCount
        }
      }
    };
  } catch (error) {
    if (error instanceof BackendAPIError && error.status === 409) {
      if (error.code === 'MONTH_CARD_NOT_ACTIVE') {
        return { code: 'NO_MONTH_CARD' };
      }
      if (error.code === 'MONTH_CARD_NO_CLAIMABLE_REWARDS') {
        return { code: 'NO_REWARDS' };
      }
    }
    logger.error('月卡一键领取失败:', error);

    return { code: 'CLAIM_FAILED' };
  }
}
