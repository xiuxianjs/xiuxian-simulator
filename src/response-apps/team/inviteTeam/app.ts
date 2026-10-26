import { inviteBackendTeam } from '@src/api/bot/team-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type InviteTeamResult = { code: 'OK'; data: { autoAccepted: boolean } } | { code: 'LOAD_FAILED'; data: { message: string } };

/**
 * 邀请入队
 * @param params.uid 邀请者uid
 * @param params.targetUid 被邀请者uid
 */
export default async function App(params: {
  uid: number;
  targetUid: number;
  bid?: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<InviteTeamResult> {
  try {
    const result = await inviteBackendTeam(params.bid, params.targetUid, params.request, params.repeatCommand);

    return { code: 'OK', data: result };
  } catch (error) {
    if (!(error instanceof Error)) {
      logger.error('邀请入队失败:', error);
    }

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '邀请失败' }
    };
  }
}
