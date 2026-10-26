export interface GuildEssenceAddResult {
  outcome: 'added' | 'too_long' | 'empty' | 'inappropriate' | 'not_joined' | 'limit_reached' | 'permission_denied' | 'permission_check_failed';
  id: number | null;
}
