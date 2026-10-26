export interface GuildEssenceRemovalResult {
  outcome: 'removed' | 'not_joined' | 'permission_denied' | 'permission_check_failed' | 'not_found' | 'not_own' | 'busy';
}
