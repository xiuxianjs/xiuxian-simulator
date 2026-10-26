import { cancelBackendTeamInvitation } from '@src/api/bot/team-invitation-cancel';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_TEAM } from '@src/constants/messages';
import { logger } from 'alemonjs';

export type CancelInvitationResult = { code: 'OK' } | { code: 'LOAD_FAILED'; data: { message: string } };

/**
 * 取消队伍邀请
 * @param params.uid 取消者uid
 * @param params.invitationId 邀请记录id
 */
export default async function App(params: {
  bid?: string;
  uid: number;
  invitationId: number;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<CancelInvitationResult> {
  try {
    const result = await cancelBackendTeamInvitation(params.bid, params.invitationId, params.request, params.repeatCommand);

    if (result.outcome !== 'cancelled') {
      const messages = { not_in_team: MSG_TEAM.NOT_IN_TEAM, not_leader: MSG_TEAM.NOT_LEADER, not_found: MSG_TEAM.INVITATION_NOT_FOUND };

      return { code: 'LOAD_FAILED', data: { message: messages[result.outcome] } };
    }

    return { code: 'OK' };
  } catch (error) {
    if (!(error instanceof Error)) {
      logger.error('取消邀请失败:', error);
    }

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '操作失败' }
    };
  }
}
