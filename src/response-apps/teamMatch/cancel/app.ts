import { cancelBackendTeamMatch } from '@src/api/bot/team-match-cancel';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type CancelMatchResult = { code: 'OK'; data: { targetLabel: string } } | { code: 'NO_MATCH' } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; request?: BackendRequestContext }): Promise<CancelMatchResult> {
  try {
    const result = await cancelBackendTeamMatch(params.bid, params.request);

    if (!result.cancelled) {
      return { code: 'NO_MATCH' };
    }

    return { code: 'OK', data: { targetLabel: result.targetLabel! } };
  } catch (error) {
    logger.error('取消匹配失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '取消匹配失败' }
    };
  }
}
