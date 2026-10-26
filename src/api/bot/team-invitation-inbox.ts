import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { TeamInvitationInbox } from '../schemas/team-invitation-inbox';

export async function refreshBackendTeamInvitations(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<TeamInvitationInbox> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'post_players_id_team_invitations_refresh', { path: { id: uid }, ...context });

  return parseBackendTeamInvitationInbox(data);
}

export function parseBackendTeamInvitationInbox(value: unknown): TeamInvitationInbox {
  const data = value as TeamInvitationInbox;
  const nullableText = (value: unknown) => value === null || typeof value === 'string';

  if (
    !data?.access ||
    typeof data.access.ok !== 'boolean' ||
    !nullableText(data.access.realmName) ||
    !Array.isArray(data.invitations) ||
    data.invitations.some(
      row => !row ||
        !Number.isInteger(row.id) ||
        !Number.isInteger(row.teamId) ||
        !nullableText(row.leaderName) ||
        !nullableText(row.inviterName) ||
        !nullableText(row.createdAt) ||
        (row.createdAt !== null && !Number.isFinite(new Date(row.createdAt).getTime()))
    )
  ) {
    throw new Error('队伍邀请接口返回不完整');
  }

  return data;
}
