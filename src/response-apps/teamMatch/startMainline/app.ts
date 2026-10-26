import { startBackendMainlineMatch } from '@src/api/bot/team-match-start';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type StartMainlineMatchResult = { code: 'OK'; data: { targetLabel: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  chapterNumber: number;
  stageNumber: number;
  request?: BackendRequestContext;
}): Promise<StartMainlineMatchResult> {
  try {
    const result = await startBackendMainlineMatch(params.bid, params.chapterNumber, params.stageNumber, params.request);

    return { code: 'OK', data: result };
  } catch (error) {
    logger.error('发起主线匹配失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '发起匹配失败' }
    };
  }
}
