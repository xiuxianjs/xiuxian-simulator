export type TeamRealmUpdateResult = {
  outcome: 'updated' | 'cancel_noop' | 'realm_not_found' | 'not_in_team' | 'not_leader';
  realmId: number | null;
};
