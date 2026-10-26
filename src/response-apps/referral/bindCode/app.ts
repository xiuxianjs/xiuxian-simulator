/**
 * 绑定邀请码 - 数据层
 */
import { bindBackendReferralCode, referralBindFailureMessage } from '@src/api/bot/referral-actions';
import { displayCurrencyText } from '@src/constants/currency';
import type { BackendRequestContext } from '@src/api/bot/context';
import { withBackendRepeatDetection } from '@src/utils/backendRepeatDetector';
import { logger } from 'alemonjs';

type BindCodeResult = { code: 'NO_CODE' } | { code: 'SUCCESS'; displayMsg: string; showBar: boolean } | { code: 'FAILED'; displayMsg: string };

export async function getBindCodeData(
  bid: string | undefined,
  uid: number,
  messageText: string | undefined,
  request?: BackendRequestContext
): Promise<BindCodeResult> {
  const text = messageText?.trim() ?? '';
  const match = text.match(/绑定邀请码\s+(.+)/);

  if (!match) {
    return { code: 'NO_CODE' };
  }

  const referralCode = match[1].trim();

  try {
    const rewards = await bindBackendReferralCode(bid, uid, referralCode, request);
    const rewardText = rewards.length > 0 ? `\n获得奖励：${rewards.map(item => `${displayCurrencyText(item.name)} ×${item.amount}`).join('、')}` : '';
    const displayMsg = await withBackendRepeatDetection(bid, uid, '绑定邀请码', `成功绑定邀请码！${rewardText}`, request);

    return { code: 'SUCCESS', displayMsg, showBar: true };
  } catch (error) {
    const businessMessage = referralBindFailureMessage(error);

    if (businessMessage) {
      const displayMsg = await withBackendRepeatDetection(bid, uid, '绑定邀请码', businessMessage, request);

      return { code: 'SUCCESS', displayMsg, showBar: false };
    }
    logger.error('绑定邀请码失败:', error);
    const errMsg = await withBackendRepeatDetection(bid, uid, '绑定邀请码', '绑定失败，请稍后再试', request);

    return { code: 'FAILED', displayMsg: errMsg };
  }
}
