import { disbandBackendTeam } from '@src/api/bot/team-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type DisbandTeamResult = { code: 'OK' } | { code: 'LOAD_FAILED'; data: { message: string } };

/**
 * 解散队伍 App 层
 */
export default async function App(params: { uid: number; bid?: string; repeatCommand?: string; request?: BackendRequestContext }): Promise<DisbandTeamResult> {
  try {
    await disbandBackendTeam(params.bid, params.request, params.repeatCommand);

    return { code: 'OK' };
  } catch (error) {
    if (error instanceof Error) {
      logger.info(`解散队伍失败: ${error.message}`);
    } else {
      logger.error('解散队伍失败:', error);
    }

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '解散失败' }
    };
  }
}
