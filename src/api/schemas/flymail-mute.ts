export type FlyMailMuteContext = { allowed: boolean; realmName: string | null; targetUid: number | null };
export type FlyMailMuteStateResult = {
  outcome: 'updated' | 'self' | 'not_found' | 'locked';
  targetName: string | null;
  realmName: string | null;
};
