/**
 * 查看邀请码 - 数据层
 */
import { getBackendReferralOverview } from '@src/api/bot/referral-overview';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

type ViewCodeResult =
  | { code: 'FAILED' }
  | {
      code: 'OK';
      referralCode: string;
      inviteCount: number;
      inviteLimit: number | null;
      pendingRewards: number;
    };

export async function getViewCodeData(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<ViewCodeResult> {
  try {
    const overview = await getBackendReferralOverview(bid, uid, request);

    return {
      code: 'OK',
      referralCode: overview.code,
      inviteCount: overview.inviteCount,
      inviteLimit: overview.inviteLimit,
      pendingRewards: overview.pendingRewards
    };
  } catch (error) {
    logger.error('查看邀请码失败:', error);

    return { code: 'FAILED' };
  }
}
