import type { DeleteFriendResult } from '@src/api/schemas/friend-removal';
import { deleteBackendFriend, getBackendFriendRemovalTarget } from '@src/api/bot/friend-removal';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_FRIEND } from '@src/constants/messages';

export function parseDeleteCommand(messageText: string): { targetArg: string; confirmed: boolean } | null {
  const match = (messageText?.trim() ?? '').match(/^[!！/#＃]?删除好友\s+(.+?)(\s+确认)?$/);

  if (!match) {
    return null;
  }

  return { targetArg: match[1].trim(), confirmed: Boolean(match[2]) };
}

export async function lookupDeletionTarget(
  bid: string | undefined,
  uid: number,
  targetArg: string,
  mention: { findOne: () => Promise<{ count?: number; data?: { UserId?: string | null } | null }> }
) {
  const text = targetArg.trim();
  const numeric = /^\d+$/.test(text) ? Number(text) : 0;

  if (Number.isFinite(numeric) && numeric > 0) {
    const serialized = numeric.toString();
    const target =
      numeric >= 1e21 || BigInt(serialized) > 9223372036854775807n ? null : await getBackendFriendRemovalTarget(bid, uid, { targetUid: serialized });

    return { targetId: numeric, target };
  }
  const mentioned = await mention.findOne();

  if (!mentioned?.count || !mentioned.data?.UserId) {
    return { targetId: null, target: null };
  }
  const target = await getBackendFriendRemovalTarget(bid, uid, { targetBid: mentioned.data.UserId });

  return { targetId: target?.id ?? null, target };
}

type Result = { code: 'OK' | 'FAIL'; data: { message: string } } | { code: 'LOCKED'; data: { realmName: string } };

export async function confirmDeleteFriend(
  bid: string | undefined,
  uid: number,
  targetId: number,
  request?: BackendRequestContext,
  prefetched?: DeleteFriendResult
): Promise<Result> {
  const result = prefetched ?? (await deleteBackendFriend(bid, uid, targetId, request));

  if (result.outcome === 'locked') {
    return { code: 'LOCKED', data: { realmName: result.realmName ?? '未知' } };
  }
  if (result.outcome === 'removed') {
    return { code: 'OK', data: { message: '已删除好友' } };
  }
  const messages = {
    self: MSG_FRIEND.CANNOT_OPERATE_SELF,
    not_friend: MSG_FRIEND.NOT_YOUR_FRIEND,
    companion: MSG_FRIEND.IS_COMPANION,
    failed: MSG_FRIEND.DELETE_FAILED
  };

  return { code: 'FAIL', data: { message: messages[result.outcome] } };
}
