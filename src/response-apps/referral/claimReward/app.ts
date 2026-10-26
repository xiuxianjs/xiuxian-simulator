/**
 * 领取邀请奖励 - 数据层
 */
import { claimBackendReferralRewards, referralClaimFailureMessage } from '@src/api/bot/referral-actions';
import { displayCurrencyText } from '@src/constants/currency';
import type { BackendRequestContext } from '@src/api/bot/context';
import { withBackendRepeatDetection } from '@src/utils/backendRepeatDetector';
import { logger } from 'alemonjs';

type ClaimRewardResult = { code: 'OK'; displayMsg: string; rewards: string[] } | { code: 'FAILED'; displayMsg: string };

export async function getClaimRewardData(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<ClaimRewardResult> {
  try {
    const result = await claimBackendReferralRewards(bid, uid, request);
    const rewards = result.issued.map(item => `${displayCurrencyText(item.name)} ×${item.amount}`);
    const displayMsg = await withBackendRepeatDetection(bid, uid, '领取邀请奖励', `成功领取 ${result.claimed} 条邀请奖励`, request);

    return { code: 'OK', displayMsg, rewards };
  } catch (error) {
    const businessMessage = referralClaimFailureMessage(error);

    if (businessMessage) {
      const displayMsg = await withBackendRepeatDetection(bid, uid, '领取邀请奖励', businessMessage, request);

      return { code: 'OK', displayMsg, rewards: [] };
    }
    logger.error('领取邀请奖励失败:', error);
    const errMsg = await withBackendRepeatDetection(bid, uid, '领取邀请奖励', '领取失败，请稍后再试', request);

    return { code: 'FAILED', displayMsg: errMsg };
  }
}
