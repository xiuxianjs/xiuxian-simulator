import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export function requireTeamObject(value: unknown, operation: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${operation}响应不完整`);
  }

  return value as Record<string, unknown>;
}

export async function createBackendTeam(bid: string | undefined, request?: BackendRequestContext, repeatCommand?: string): Promise<number> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = requireTeamObject(
    await requestBackend(bid, 'post_teams', { ...writeContext(request), headers: repeatPresentationHeaders(repeatCommand) }),
    '创建队伍'
  );

  if (!Number.isInteger(data.id) || (data.id as number) <= 0) {
    throw new Error('创建队伍响应不完整');
  }

  return data.id as number;
}

export async function applyBackendTeam(
  bid: string | undefined,
  teamId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<{ autoApproved: boolean }> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = requireTeamObject(
    await requestBackend(bid, 'post_teams_teamId_applications', {
      path: { teamId },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    }),
    '队伍申请'
  );

  if (typeof data.status !== 'number') {
    throw new Error('队伍申请响应不完整');
  }

  return { autoApproved: data.status === 1 };
}

export async function inviteBackendTeam(
  bid: string | undefined,
  inviteeId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<{ autoAccepted: boolean }> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = requireTeamObject(
    await requestBackend(bid, 'post_teams_invitations', { body: { inviteeId }, ...writeContext(request), headers: repeatPresentationHeaders(repeatCommand) }),
    '队伍邀请'
  );

  if (typeof data.status !== 'number') {
    throw new Error('队伍邀请响应不完整');
  }

  return { autoAccepted: data.status === 1 };
}

export async function approveBackendTeamApplication(
  bid: string | undefined,
  applicationId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<void> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  requireTeamObject(
    await requestBackend(bid, 'post_teams_applications_applicationId_approve', {
      path: { applicationId },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    }),
    '同意队伍申请'
  );
}

export async function rejectBackendTeamApplication(
  bid: string | undefined,
  applicationId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<void> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  requireTeamObject(
    await requestBackend(bid, 'post_teams_applications_applicationId_reject', {
      path: { applicationId },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    }),
    '拒绝队伍申请'
  );
}

export async function acceptBackendTeamInvitation(
  bid: string | undefined,
  invitationId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<void> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  requireTeamObject(
    await requestBackend(bid, 'post_teams_invitations_invitationId_accept', {
      path: { invitationId },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    }),
    '接受队伍邀请'
  );
}

export async function rejectBackendTeamInvitation(
  bid: string | undefined,
  invitationId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<void> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  requireTeamObject(
    await requestBackend(bid, 'post_teams_invitations_invitationId_reject', {
      path: { invitationId },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    }),
    '拒绝队伍邀请'
  );
}

export async function kickBackendTeamMember(bid: string | undefined, memberId: number, request?: BackendRequestContext, repeatCommand?: string): Promise<void> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  requireTeamObject(
    await requestBackend(bid, 'delete_teams_members_memberId', {
      path: { memberId },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    }),
    '踢出队员'
  );
}

export async function leaveBackendTeam(bid: string | undefined, request?: BackendRequestContext, repeatCommand?: string): Promise<void> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  requireTeamObject(await requestBackend(bid, 'post_teams_leave', { ...writeContext(request), headers: repeatPresentationHeaders(repeatCommand) }), '离开队伍');
}

export async function disbandBackendTeam(bid: string | undefined, request?: BackendRequestContext, repeatCommand?: string): Promise<void> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  requireTeamObject(
    await requestBackend(bid, 'delete_teams_mine', { ...writeContext(request), headers: repeatPresentationHeaders(repeatCommand) }),
    '解散队伍'
  );
}

export function parseTeamCreated(value: unknown): { teamId: number } {
  const data = requireTeamObject(value, '创建队伍');

  if (!Number.isSafeInteger(data.id) || Number(data.id) <= 0) {
    throw new Error('创建队伍响应不完整');
  }

  return { teamId: Number(data.id) };
}

export function parseTeamApplicationStatus(value: unknown): { autoApproved: boolean } {
  const data = requireTeamObject(value, '队伍申请');

  if (typeof data.status !== 'number') {
    throw new Error('队伍申请响应不完整');
  }

  return { autoApproved: data.status === 1 };
}

export function parseTeamAcknowledgement(value: unknown, key: 'left' | 'disbanded' | 'rejected'): Record<string, unknown> {
  const data = requireTeamObject(value, '队伍操作');

  if (data[key] !== true) {
    throw new Error('队伍操作响应不完整');
  }

  return data;
}

export function parseTeamTargetMutation(
  value: unknown,
  invite: boolean
): { outcome: 'target_missing' } | { outcome: 'done'; autoAccepted: boolean; invitationId?: number } {
  const data = requireTeamObject(value, '队伍操作');

  if (data.outcome === 'target_missing') {
    return { outcome: 'target_missing' };
  }
  if (invite ? typeof data.status !== 'number' : data.kicked !== true) {
    throw new Error('队伍操作响应不完整');
  }

  return {
    outcome: 'done',
    autoAccepted: invite && data.status === 1,
    ...(invite && data.status === 0 && Number.isSafeInteger(data.id) && Number(data.id) > 0 ? { invitationId: Number(data.id) } : {})
  };
}
