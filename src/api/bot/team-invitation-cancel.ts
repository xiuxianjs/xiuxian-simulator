import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { TeamInvitationCancelResult } from '../schemas/team-invitation-cancel';

export async function cancelBackendTeamInvitation(
  bid: string | undefined,
  invitationId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<TeamInvitationCancelResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'delete_teams_invitations_invitationId', {
    path: { invitationId: String(invitationId) },
    ...context,
    headers: repeatPresentationHeaders(repeatCommand)
  });

  if (!data || !['cancelled', 'not_in_team', 'not_leader', 'not_found'].includes(data.outcome)) {
    throw new Error('取消队伍邀请响应不完整');
  }

  return data;
}
