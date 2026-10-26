import { challengeBackendTianjiao } from '@src/api/bot/tianjiao-challenge';
import { presentTianjiaoChallenge } from '@src/api/bot/tianjiao-robot-query';
import type { BackendRequestContext } from '@src/api/bot/context';
export type TianjiaoChallengeAppResult =
  | { code: 'NO_MATCH' }
  | { code: 'PARAM_ERROR' }
  | { code: 'FAILED'; message: string; uid: number }
  | { code: 'SUCCESS'; data: { title: string; lines: string[]; logId?: string } };
export default async function App(params: {
  bid?: string;
  uid: number;
  messageText: string;
  request?: BackendRequestContext;
}): Promise<TianjiaoChallengeAppResult> {
  const match = params.messageText.match(/^(?:!|！|\/|#|＃)?(?:登天挑战|天骄挑战)\s+(\d+)$/);

  if (!match) {
    return { code: 'NO_MATCH' };
  }
  const targetRank = Number(match[1]);

  if (!Number.isSafeInteger(targetRank)) {
    return { code: 'PARAM_ERROR' };
  }
  try {
    const r = await challengeBackendTianjiao(params.bid, params.uid, targetRank, params.request);

    if (!r.success) {
      return { code: 'FAILED', message: r.message, uid: params.uid };
    }

    return presentTianjiaoChallenge(r);
  } catch (e) {
    return { code: 'FAILED', message: e instanceof Error ? e.message : '登天挑战失败', uid: params.uid };
  }
}
