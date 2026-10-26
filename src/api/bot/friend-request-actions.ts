import { repeatPresentationHeaders } from './repeat-presentation';
import { BackendAPIError, requestBackend, writeContext } from './client';
import type { FriendRequestMutationResult } from '../schemas/friend-request-mutation';
import type { BackendRequestContext } from './context';

export type BackendFriendRequestSendResult = FriendRequestMutationResult;
export type BackendFriendRequestAcceptResult = FriendRequestMutationResult;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('好友申请结算响应不完整');
  }

  return value as Record<string, unknown>;
}

export function parseBackendFriendMutation(value: unknown): BackendFriendRequestSendResult {
  const row = record(value);

  if (
    typeof row.success !== 'boolean' ||
    typeof row.requestId !== 'number' ||
    !Number.isSafeInteger(row.requestId) ||
    row.requestId < 0 ||
    typeof row.targetName !== 'string' ||
    typeof row.fromUserName !== 'string' ||
    typeof row.message !== 'string'
  ) {
    throw new Error('好友申请结算响应不完整');
  }

  return row as BackendFriendRequestSendResult;
}

export function isFriendRequestDomainFailure(error: unknown): error is BackendAPIError {
  return error instanceof BackendAPIError && [400, 403, 404, 409].includes(error.status ?? 0);
}

export async function acceptBackendFriendRequest(
  bid: string | undefined,
  uid: number,
  requestId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<BackendFriendRequestAcceptResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  const result = parseBackendFriendMutation(
    await requestBackend(bid, 'post_players_id_friend_requests_requestId_accept', {
      path: { id: uid, requestId },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    })
  );

  if (result.requestId !== requestId) {
    throw new Error('好友申请结算响应不完整');
  }

  return result;
}
