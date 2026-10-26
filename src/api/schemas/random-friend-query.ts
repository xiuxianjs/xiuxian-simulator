export interface RandomFriendQueryData {
  access: { ok: boolean; realmName: string | null };
  player: { uid: number; name: string; realmName: string | null; activeTitle: string | null } | null;
}
