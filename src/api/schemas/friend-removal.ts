export type FriendRemovalTarget = { id: number; name: string | null };
export type FriendRemovalTargetData = { target: FriendRemovalTarget | null };
export type DeleteFriendResult = {
  outcome: 'removed' | 'self' | 'not_friend' | 'companion' | 'locked' | 'failed';
  realmName: string | null;
};

export function parseDeleteFriendResult(value: unknown): DeleteFriendResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('删除好友响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (
    typeof row.outcome !== 'string' ||
    !['removed', 'self', 'not_friend', 'companion', 'locked', 'failed'].includes(row.outcome) ||
    (row.realmName !== null && typeof row.realmName !== 'string')
  ) {
    throw new Error('删除好友响应不完整');
  }

  return row as DeleteFriendResult;
}
