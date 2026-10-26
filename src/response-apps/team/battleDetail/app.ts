import { BackendAPIError, getBackendTeamBattleDetail } from '@src/api/bot';
import { logger } from 'alemonjs';

export type TeamBattleDetailResult =
  | {
      code: 'OK';
      data: NonNullable<Awaited<ReturnType<typeof getBackendTeamBattleDetail>>>;
    }
  | { code: 'NOT_FOUND' }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; recordId: number }): Promise<TeamBattleDetailResult> {
  try {
    const result = await getBackendTeamBattleDetail(params.bid, params.recordId);

    return {
      code: 'OK',
      data: result
    };
  } catch (error) {
    if (error instanceof BackendAPIError && error.status === 404) {
      return { code: 'NOT_FOUND' };
    }
    if (error instanceof BackendAPIError && error.status === 403) {
      return { code: 'LOAD_FAILED', data: { message: '你无权查看该队伍战斗记录' } };
    }
    logger.error('查询队伍战斗详情失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '查询失败' }
    };
  }
}
