export type BlocklistRemovalSelector = { recordId: string } | { exactName: string };
export type BlocklistRemovalResult = {
  outcome: 'removed' | 'not_found' | 'not_blocked' | 'locked' | 'failed';
  blockedUserId: number | null;
  name: string | null;
  realmName: string | null;
};
