/** Authoritative weekly guild stipend settlement and its server calculation facts. */
export interface GuildStipendData {
  guildId: number;
  amount: number;
  weeklyActivity: number;
  guildLevel: number;
  baseAmount: number;
  levelMultiplier: number;
  activityMultiplier: number;
}
