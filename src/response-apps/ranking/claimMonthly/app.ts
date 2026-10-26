import { EMPTY_STRING, FIRST_ARG_INDEX } from '@src/constants';
import type { BackendRequestContext } from '@src/api/bot/context';
import { claimBackendMonthlyRewards } from '@src/api/bot/tower-reward-claims';

export type ClaimMonthlyResult =
  | { code: 'PARAM_ERROR' }
  | { code: 'FAILED'; message: string; uid: number }
  | { code: 'BATCH_SUCCESS'; data: { claimedCount: number; rewardTexts: string[] } }
  | { code: 'SUCCESS'; data: { rewardTexts: string[] } };

export default async function App(params: { bid: string; uid: number; messageText: string; request?: BackendRequestContext }): Promise<ClaimMonthlyResult> {
  const { bid, uid, messageText, request } = params;

  const text = (messageText || EMPTY_STRING).replace(/^(!|！|\/|#|＃)?领取月度奖励\s*/, EMPTY_STRING).trim();
  const args = text ? text.split(/\s+/) : [];
  const rewardIdStr = args[FIRST_ARG_INDEX];

  if (args.length > 1) {
    return { code: 'PARAM_ERROR' };
  }

  if (!rewardIdStr || rewardIdStr === '全部' || rewardIdStr === 'all') {
    try {
      const result = await claimBackendMonthlyRewards(bid, uid, 'all', request, messageText);

      return { code: 'BATCH_SUCCESS', data: { claimedCount: result.claimedCount ?? 0, rewardTexts: result.rewardTexts } };
    } catch (error: any) {
      return { code: 'FAILED', message: error?.message ?? '领取失败', uid };
    }
  }

  const rewardId = Number(rewardIdStr);

  if (!/^\d+$/.test(rewardIdStr) || !Number.isSafeInteger(rewardId) || rewardId <= 0) {
    return { code: 'PARAM_ERROR' };
  }

  try {
    const result = await claimBackendMonthlyRewards(bid, uid, rewardId, request, messageText);

    return { code: 'SUCCESS', data: { rewardTexts: result.rewardTexts } };
  } catch (error: any) {
    return { code: 'FAILED', message: error?.message ?? '领取失败', uid };
  }
}
