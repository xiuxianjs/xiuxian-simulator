import { repeatPresentationHeaders } from './repeat-presentation';
import type { FriendRequestRejectResult } from '../schemas/friend-request-reject';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
export async function rejectBackendFriendRequest(
  bid: string | undefined,
  uid: number,
  requestId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const result = await requestBackend(bid, 'post_players_id_friend_requests_requestId_reject', {
    path: { id: uid, requestId },
    ...context,
    headers: repeatPresentationHeaders(repeatCommand)
  });

  return parseBackendFriendReject(result);
}

export function parseBackendFriendReject(result: unknown) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('拒绝申请响应不完整');
  }
  const row = result as Record<string, unknown>;

  if (
    typeof row.outcome !== 'string' ||
    !['rejected', 'not_found', 'processed', 'locked', 'failed'].includes(row.outcome) ||
    typeof row.listed !== 'boolean' ||
    (row.fromUserName !== null && typeof row.fromUserName !== 'string') ||
    (row.realmName !== null && typeof row.realmName !== 'string') ||
    (!row.listed && row.fromUserName !== null) ||
    (row.outcome !== 'rejected' && row.listed)
  ) {
    throw new Error('拒绝申请响应不完整');
  }

  return row as FriendRequestRejectResult;
}
