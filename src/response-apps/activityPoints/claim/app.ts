import { claimBackendActivityReward } from '@src/api/bot/activity-points-claim';
import { displayCurrencyText } from '@src/constants/currency';
import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
import { getBackendRobotIdentity } from '@src/api/bot/identity';
import type { CodeResult } from '@src/types/result';
import { logger } from 'alemonjs';

export type ActivityPointsClaimResult = CodeResult<
  'OK',
  'INVALID_USER' | 'INVALID_REQUIRED_POINTS' | 'BUSY' | 'ALREADY_CLAIMED' | 'INSUFFICIENT_POINTS' | 'REWARD_NOT_FOUND' | 'USER_NOT_FOUND' | 'CLAIM_FAILED',
  { userName: string; requiredPoints: number; rewards: Array<{ name: string; amount: number }> }
>;

function failureCode(error: BackendAPIError): Exclude<ActivityPointsClaimResult['code'], 'OK' | 'INVALID_USER' | 'INVALID_REQUIRED_POINTS'> {
  if (error.code === 'IDEMPOTENCY_IN_PROGRESS') {
    return 'BUSY';
  }
  if (error.code === 'ACTIVITY_ALREADY_CLAIMED') {
    return 'ALREADY_CLAIMED';
  }
  if (error.code === 'ACTIVITY_INSUFFICIENT_POINTS') {
    return 'INSUFFICIENT_POINTS';
  }
  if (error.code === 'ACTIVITY_REWARD_NOT_FOUND') {
    return 'REWARD_NOT_FOUND';
  }
  if (error.code === 'NOT_FOUND') {
    return 'USER_NOT_FOUND';
  }

  return 'CLAIM_FAILED';
}

export default async function App(params: {
  bid?: string;
  type: 'daily' | 'weekly';
  requiredPoints: number;
  request?: BackendRequestContext;
}): Promise<ActivityPointsClaimResult> {
  if (!params.bid?.trim()) {
    return { code: 'INVALID_USER' };
  }
  if (!Number.isInteger(params.requiredPoints) || params.requiredPoints <= 0) {
    return { code: 'INVALID_REQUIRED_POINTS' };
  }

  try {
    const identity = await getBackendRobotIdentity(params.bid, params.request);
    const uid = identity.account.playerId;

    if (!uid || uid <= 0) {
      return { code: 'INVALID_USER' };
    }

    const result = await claimBackendActivityReward(params.bid, uid, params.type, params.requiredPoints, params.request);

    return {
      code: 'OK',
      data: {
        userName: result.userName,
        requiredPoints: result.requiredPoints,
        rewards: result.issued.map(reward => ({ name: displayCurrencyText(reward.name), amount: reward.amount }))
      }
    };
  } catch (error) {
    if (error instanceof BackendAPIError) {
      return { code: failureCode(error) };
    }
    logger.error(`领取${params.type === 'daily' ? '日常' : '周常'}活跃奖励失败:`, error);

    return { code: 'CLAIM_FAILED' };
  }
}
