import { BackendAPIError } from '@src/api/bot/client';
import { challengeBackendTongtianTower, type BackendTongtianChallenge } from '@src/api/bot/tongtian-tower';
import type { BackendRequestContext } from '@src/api/bot/context';

export type ChallengeRankResult =
  | { code: 'NO_MATCH' | 'PARAM_ERROR' }
  | { code: 'FAILED'; uid: number; message: string; needPotion?: boolean }
  | { code: 'SUCCESS'; data: BackendTongtianChallenge };

export default async function App(params: { uid: number; bid?: string; messageText: string; request?: BackendRequestContext }): Promise<ChallengeRankResult> {
  const match = (params.messageText || '').match(/^(?:!|！|\/|#|＃)?挑战排名\s+(\d+)\s*$/);

  if (!match) {
    return /^\s*(?:!|！|\/|#|＃)?挑战排名/.test(params.messageText || '') ? { code: 'PARAM_ERROR' } : { code: 'NO_MATCH' };
  }
  try {
    return { code: 'SUCCESS', data: await challengeBackendTongtianTower(params.bid, params.uid, Number(match[1]), params.request) };
  } catch (error) {
    const message = error instanceof BackendAPIError ? error.message : error instanceof Error ? error.message : '挑战排名失败，请稍后再试';

    return { code: 'FAILED', uid: params.uid, message, needPotion: error instanceof BackendAPIError && error.code === 'TONGTIAN_INSUFFICIENT_QI' };
  }
}
