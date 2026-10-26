import { startBackendDungeonMatch } from '@src/api/bot/team-match-start';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type StartDungeonMatchResult = { code: 'OK'; data: { targetLabel: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; dungeonId: number; request?: BackendRequestContext }): Promise<StartDungeonMatchResult> {
  try {
    const result = await startBackendDungeonMatch(params.bid, params.dungeonId, params.request);

    return { code: 'OK', data: result };
  } catch (error) {
    logger.error('发起秘境匹配失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '发起匹配失败' }
    };
  }
}
