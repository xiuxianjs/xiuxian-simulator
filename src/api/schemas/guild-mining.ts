export type GuildMiningOutcome = 'started' | 'in_progress' | 'settled';

/** Authoritative result of a guild mining command. */
export interface GuildMiningData {
  outcome: GuildMiningOutcome;
  message: string;
  guildId: number;
  guildName: string;
  veinLevel: number;
  miningQuota: number;
  started: boolean;
  settledHours: number;
  spiritStoneAdded: number;
  contributionAdded: number;
  dailyActivityAdded: number;
  capReached: boolean;
  remainingSeconds: number;
}
