import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { FriendWorkflowInput, FriendWorkflowResult, TeamWorkflowInput, TeamWorkflowResult } from '../schemas/social-workflows';
import { parseDeleteFriendResult } from '../schemas/friend-removal';
function identity(bid: string | undefined): string {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return bid;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('社交业务响应不完整');
  }

  return value as Record<string, unknown>;
}
export async function requestFriendWorkflow(
  bid: string | undefined,
  uid: number,
  body: FriendWorkflowInput,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<FriendWorkflowResult> {
  const preview = (body.action === 'remove' && !body.confirmed) || (!body.targetUid && !body.targetBid);
  const context = preview ? (request?.requestId ? { requestId: request.requestId } : {}) : writeContext(request);
  const data = record(
    await requestBackend(identity(bid), 'post_players_id_friends_workflow', {
      path: { id: uid },
      body,
      ...context,
      headers: repeatPresentationHeaders(repeatCommand)
    })
  );

  return parseBackendFriendWorkflow(data, body.action);
}

export function parseBackendFriendWorkflow(value: unknown, action: 'request' | 'remove'): FriendWorkflowResult {
  const data = record(value);

  if (
    typeof data.outcome !== 'string' ||
    !['locked', 'target_invalid', 'target_missing', 'confirmation_required', 'result'].includes(data.outcome) ||
    (data.realmName !== null && typeof data.realmName !== 'string') ||
    typeof data.targetId !== 'string'
  ) {
    throw new Error('好友业务响应不完整');
  }
  if (data.target !== null) {
    const target = record(data.target);

    if (!Number.isInteger(target.id) || Number(target.id) <= 0 || (target.name !== null && typeof target.name !== 'string')) {
      throw new Error('好友目标响应不完整');
    }
  }
  if (data.outcome === 'result' && action === 'request') {
    const result = record(data.request);

    if (
      typeof result.success !== 'boolean' ||
      !Number.isInteger(result.requestId) ||
      Number(result.requestId) < 0 ||
      ['targetName', 'fromUserName', 'message'].some(key => typeof result[key] !== 'string')
    ) {
      throw new Error('好友申请结算响应不完整');
    }
  }
  if (data.outcome === 'result' && action === 'remove') {
    parseDeleteFriendResult(data.removal);
  }

  return data as FriendWorkflowResult;
}
export async function requestTeamWorkflow(
  bid: string | undefined,
  uid: number,
  body: TeamWorkflowInput,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<TeamWorkflowResult> {
  const context = body.action === 'applications' ? (request?.requestId ? { requestId: request.requestId } : {}) : writeContext(request);
  const data = record(
    await requestBackend(identity(bid), 'post_players_id_team_workflow', {
      path: { id: uid },
      body,
      ...context,
      headers: repeatPresentationHeaders(repeatCommand)
    })
  );

  return parseBackendTeamWorkflow(data, body.action);
}

export function parseBackendTeamWorkflow(value: unknown, action: 'applications' | 'position' | 'leadership'): TeamWorkflowResult {
  const data = record(value);

  if (action !== 'applications') {
    const outcomes =
      action === 'position'
        ? ['updated', 'invalid_position', 'not_in_team', 'not_leader', 'target_not_in_team', 'same_position', 'target_missing']
        : ['transferred', 'self', 'not_in_team', 'not_leader', 'target_not_in_team', 'target_missing'];

    if (typeof data.outcome !== 'string' || !outcomes.includes(data.outcome)) {
      throw new Error('队伍操作响应不完整');
    }
  } else {
    const records = record(data.records);

    if (
      typeof records.isLeader !== 'boolean' ||
      typeof records.canUseSecondLayerFeature !== 'boolean' ||
      typeof records.realmName !== 'string' ||
      !Array.isArray(records.applications) ||
      records.applications.some(
        item => !item ||
          !Number.isFinite(item.id) ||
          (item.leaderName !== null && typeof item.leaderName !== 'string') ||
          (item.createdAt !== null && (typeof item.createdAt !== 'string' || !Number.isFinite(new Date(item.createdAt).getTime())))
      )
    ) {
      throw new Error('队伍申请响应不完整');
    }
    if (records.canUseSecondLayerFeature && records.isLeader) {
      const pending = record(data.pending);

      if (
        (pending.leaderName !== null && typeof pending.leaderName !== 'string') ||
        !Array.isArray(pending.applications) ||
        pending.applications.some(
          item => !item || !Number.isFinite(item.id) || !Number.isFinite(item.userId) || (item.userName !== null && typeof item.userName !== 'string')
        )
      ) {
        throw new Error('队伍申请响应不完整');
      }
    }
  }

  return data as TeamWorkflowResult;
}
