import { kickBackendTeamMember } from '@src/api/bot/team-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type KickResult = { code: 'OK' } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  uid: number;
  targetUid: number;
  bid?: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<KickResult> {
  try {
    await kickBackendTeamMember(params.bid, params.targetUid, params.request, params.repeatCommand);

    return { code: 'OK' };
  } catch (error) {
    logger.error('踢出队员失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '操作失败' }
    };
  }
}
