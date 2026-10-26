import { leaveBackendTeam } from '@src/api/bot/team-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type LeaveTeamResult = { code: 'OK' } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; repeatCommand?: string; request?: BackendRequestContext }): Promise<LeaveTeamResult> {
  try {
    await leaveBackendTeam(params.bid, params.request, params.repeatCommand);

    return { code: 'OK' };
  } catch (error) {
    logger.error('离开队伍失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '离开失败' }
    };
  }
}
