import { EMPTY_STRING, FIRST_ARG_INDEX } from '@src/constants';
import type { BackendRequestContext } from '@src/api/bot/context';
import { claimBackendFirstRewards } from '@src/api/bot/tower-reward-claims';

export type ClaimFirstResult =
  | { code: 'PARAM_ERROR' }
  | { code: 'FAILED'; message: string; uid: number }
  | { code: 'BATCH_SUCCESS'; data: { claimedCount: number; rewardTexts: string[] } }
  | { code: 'SUCCESS'; data: { ranking: number; rewardTexts: string[] } };

export default async function App(params: { bid: string; uid: number; messageText: string; request?: BackendRequestContext }): Promise<ClaimFirstResult> {
  const { bid, uid, messageText, request } = params;

  const text = (messageText || EMPTY_STRING).replace(/^(!|！|\/|#|＃)?领取首通奖励\s*/, EMPTY_STRING).trim();
  const args = text ? text.split(/\s+/) : [];
  const rankingStr = args[FIRST_ARG_INDEX];

  if (args.length > 1) {
    return { code: 'PARAM_ERROR' };
  }

  if (!rankingStr || rankingStr === '全部' || rankingStr === 'all') {
    try {
      const result = await claimBackendFirstRewards(bid, uid, 'all', request);

      return { code: 'BATCH_SUCCESS', data: { claimedCount: result.claimedCount ?? 0, rewardTexts: result.rewardTexts } };
    } catch (error: any) {
      return { code: 'FAILED', message: error?.message ?? '领取失败', uid };
    }
  }

  const ranking = Number(rankingStr);

  if (!/^\d+$/.test(rankingStr) || !Number.isSafeInteger(ranking) || ranking <= 0) {
    return { code: 'PARAM_ERROR' };
  }

  try {
    const result = await claimBackendFirstRewards(bid, uid, ranking, request);

    return { code: 'SUCCESS', data: { ranking, rewardTexts: result.rewardTexts } };
  } catch (error: any) {
    return { code: 'FAILED', message: error?.message ?? '领取失败', uid };
  }
}
