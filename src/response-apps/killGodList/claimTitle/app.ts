import { claimBackendKillGodTitle } from '@src/api/bot/shaqi-queries';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type ClaimKillGodTitleAppResult =
  | { code: 'OK' }
  | { code: 'TITLE_NOT_FOUND' }
  | { code: 'NOT_RANK1' }
  | { code: 'LIST_TOO_SHORT' }
  | { code: 'ALREADY_CLAIMED' }
  | { code: 'LOCK_FAIL' }
  | { code: 'ERROR' };

export default async function App(params: { bid?: string; uid: number; request?: BackendRequestContext }): Promise<ClaimKillGodTitleAppResult> {
  try {
    const code = await claimBackendKillGodTitle(params.bid, params.uid, params.request);

    return { code };
  } catch (error) {
    logger.error('[领取杀神称号] 错误:', error);

    return { code: 'ERROR' };
  }
}
