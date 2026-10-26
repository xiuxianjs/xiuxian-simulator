export type GuildMinRealmOptionsData = { realms: Array<{ id: number; name: string; level: number }> };
export type GuildMinRealmSetData = {
  outcome: 'updated' | 'not_joined' | 'denied' | 'permission_failed' | 'realm_missing';
  minRealmId: number | null;
  realmName: string | null;
};
