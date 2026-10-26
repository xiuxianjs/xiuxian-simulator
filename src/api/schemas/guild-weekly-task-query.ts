export interface GuildWeeklyMilestoneQueryItem {
  id: number;
  threshold: number;
  description: string | null;
  claimed: boolean;
  canClaim: boolean;
}

export interface GuildWeeklyTaskProgressItem {
  key: 'checkin' | 'mining' | 'exchange';
  label: string;
  progress: number;
  target: number;
  unit: string;
  activityReward: number;
  bonusText: string;
  completed: boolean;
}

export interface GuildWeeklyTaskQueryData {
  guildId: number;
  guildName: string;
  contributionPoints: number;
  weeklyActivity: number;
  weeklyActivityMax: number;
  stipendThreshold: number;
  stipendPreviewAmount: number;
  stipendBaseAmount: number;
  stipendGuildLevel: number;
  stipendLevelMultiplier: number;
  stipendActivityMultiplier: number;
  weeklyCheckinCount: number;
  weeklyMiningCount: number;
  weeklyExchangeCount: number;
  weeklyTasks: GuildWeeklyTaskProgressItem[];
  claimAllAvailable: boolean;
  milestones: GuildWeeklyMilestoneQueryItem[];
}
