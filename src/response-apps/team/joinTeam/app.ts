import { applyBackendTeam } from '@src/api/bot/team-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type JoinTeamResult = { code: 'OK'; data: { autoApproved: boolean } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  uid: number;
  teamId: number;
  bid?: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<JoinTeamResult> {
  try {
    const result = await applyBackendTeam(params.bid, params.teamId, params.request, params.repeatCommand);

    return {
      code: 'OK',
      data: result
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.info(`加入队伍失败: ${error.message}`);
    } else {
      logger.error('加入队伍失败:', error);
    }

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '申请失败' }
    };
  }
}
