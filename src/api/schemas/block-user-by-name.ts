export interface BlockUserByNameResult {
  outcome: 'blocked' | 'locked' | 'target_not_found' | 'self' | 'target_missing' | 'full' | 'already_blocked' | 'failed';
  name: string | null;
  realmName: string | null;
}
