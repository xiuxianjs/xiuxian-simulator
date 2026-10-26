import { acceptBackendTeamInvitation } from '@src/api/bot/team-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type AcceptInvitationResult = { code: 'OK' } | { code: 'LOAD_FAILED'; data: { message: string } };

/**
 * 接受队伍邀请
 * @param params.uid 被邀请者uid
 * @param params.invitationId 邀请记录id
 */
export default async function App(params: {
  uid: number;
  invitationId: number;
  bid?: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AcceptInvitationResult> {
  try {
    await acceptBackendTeamInvitation(params.bid, params.invitationId, params.request, params.repeatCommand);

    return { code: 'OK' };
  } catch (error) {
    if (!(error instanceof Error)) {
      logger.error('接受邀请失败:', error);
    }

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '操作失败' }
    };
  }
}
