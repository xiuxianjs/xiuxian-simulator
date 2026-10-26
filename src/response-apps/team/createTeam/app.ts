import { createBackendTeam } from '@src/api/bot/team-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type CreateTeamResult = { code: 'OK'; data: { teamId: number } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; repeatCommand?: string; request?: BackendRequestContext }): Promise<CreateTeamResult> {
  try {
    const teamId = await createBackendTeam(params.bid, params.request, params.repeatCommand);

    return { code: 'OK', data: { teamId } };
  } catch (error) {
    logger.error('创建队伍失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '创建队伍失败' }
    };
  }
}
