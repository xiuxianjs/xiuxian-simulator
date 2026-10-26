export interface GuildDailyMilestoneQueryItem {
  id: number;
  threshold: number;
  description: string;
  claimed: boolean;
  canClaim: boolean;
}

export interface GuildDailyTaskProjection {
  key: 'checkin' | 'mining' | 'exchange' | 'worship' | 'storyline';
  line: string;
  actionAvailable: boolean;
  actionLabel: string;
}

export interface GuildDailyTaskQueryData {
  guildId: number;
  guildName: string;
  contributionPoints: number;
  dailyActivity: number;
  dailyActivityMax: number;
  checkinDone: boolean;
  dailyWorshipDone: boolean;
  dailyStorylineDone: boolean;
  dailyMiningCount: number;
  dailyExchangeCount: number;
  miningText: string;
  prestigeRemaining: number;
  dailyTasks: GuildDailyTaskProjection[];
  claimAllAvailable: boolean;
  milestones: GuildDailyMilestoneQueryItem[];
}
