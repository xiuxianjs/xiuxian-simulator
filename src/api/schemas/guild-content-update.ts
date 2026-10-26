export interface GuildContentUpdateResult {
  field: 'intro' | 'notice';
  outcome: 'updated' | 'too_long' | 'empty' | 'inappropriate' | 'not_joined' | 'permission_denied' | 'permission_check_failed';
}
