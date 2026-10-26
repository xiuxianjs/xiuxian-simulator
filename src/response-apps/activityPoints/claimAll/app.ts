import { claimAllBackendActivityRewards } from '@src/api/bot/activity-points-claim';
import { displayCurrencyText } from '@src/constants/currency';
import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
import { getBackendRobotIdentity } from '@src/api/bot/identity';
import type { CodeResult } from '@src/types/result';
import { logger } from 'alemonjs';

export type ActivityPointsClaimAllResult = CodeResult<
  'OK',
  'INVALID_USER' | 'NOTHING_TO_CLAIM' | 'CLAIM_FAILED',
  {
    userName: string;
    partial: boolean;
    taskRewards: Array<{ name: string; amount: number }>;
    claimed: Array<{ requiredPoints: number; rewards: Array<{ name: string; amount: number }> }>;
    error?: string;
  }
>;

export default async function App(params: { bid?: string; type: 'daily' | 'weekly'; request?: BackendRequestContext }): Promise<ActivityPointsClaimAllResult> {
  if (!params.bid?.trim()) {
    return { code: 'INVALID_USER' };
  }

  try {
    const identity = await getBackendRobotIdentity(params.bid, params.request);
    const uid = identity.account.playerId;

    if (!uid || uid <= 0) {
      return { code: 'INVALID_USER' };
    }

    const result = await claimAllBackendActivityRewards(params.bid, uid, params.type, params.request);
    const claimed = result.claimed.map(item => ({
      requiredPoints: item.requiredPoints,
      rewards: item.issued.map(reward => ({ name: displayCurrencyText(reward.name), amount: reward.amount }))
    }));

    return {
      code: 'OK',
      data: {
        userName: result.claimed[0]?.userName ?? result.userName ?? '',
        taskRewards: (result.taskRewards ?? []).map(reward => ({ name: displayCurrencyText(reward.name), amount: reward.amount })),
        partial: result.partial,
        claimed,
        ...(result.error ? { error: result.error } : {})
      }
    };
  } catch (error) {
    if (error instanceof BackendAPIError && error.code === 'ACTIVITY_NOTHING_TO_CLAIM') {
      return { code: 'NOTHING_TO_CLAIM' };
    }
    logger.error(`一键领取${params.type === 'daily' ? '日常' : '周常'}活跃奖励失败:`, error);

    return { code: 'CLAIM_FAILED' };
  }
}
