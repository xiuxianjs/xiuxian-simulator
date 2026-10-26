export interface GuildCancelApplicationResult {
  outcome: 'cancelled' | 'not_pending';
  guildExists: boolean;
  guildName: string | null;
}
