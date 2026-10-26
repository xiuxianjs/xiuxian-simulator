import { rejectBackendFriendRequest } from '@src/api/bot/friend-request-reject';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_COMMON, MSG_FRIEND } from '@src/constants/messages';

export function parseRejectCommand(messageText: string): number | null {
  const match = (messageText?.trim() ?? '').match(/^[!！/#＃]?拒绝结交\s+(\d+)$/);

  if (!match) {
    return null;
  }
  const id = parseInt(match[1], 10);

  return isNaN(id) ? null : id;
}

type Result = { code: 'OK'; data: { fromUserName: string } } | { code: 'FAIL'; data: { message: string } } | { code: 'LOCKED'; data: { realmName: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  requestId: number;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  if (!Number.isFinite(params.requestId)) {
    throw new Error('申请 ID 超出可查询范围');
  }
  if (params.requestId >= 1e21 || BigInt(params.requestId.toString()) > 9223372036854775807n) {
    return { code: 'FAIL', data: { message: MSG_FRIEND.APPLICATION_NOT_FOUND } };
  }
  const result = await rejectBackendFriendRequest(params.bid, params.uid, params.requestId, params.request, params.repeatCommand);

  if (result.outcome === 'locked') {
    return { code: 'LOCKED', data: { realmName: result.realmName ?? '未知' } };
  }
  if (result.outcome === 'rejected') {
    return { code: 'OK', data: { fromUserName: result.listed ? (result.fromUserName ?? '未知用户') : '对方' } };
  }
  const messages = { not_found: MSG_FRIEND.APPLICATION_NOT_FOUND, processed: MSG_FRIEND.REQUEST_PROCESSED, failed: MSG_COMMON.OPERATION_FAILED };

  return { code: 'FAIL', data: { message: messages[result.outcome] } };
}
