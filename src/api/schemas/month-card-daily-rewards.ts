export interface MonthCardDailyRewardDefinition {
  spiritCrystal: number;
  mentalPillItemId: number;
  mentalPillQuantity: number;
  qiPillItemId: number;
  qiPillQuantity: number;
}

export interface MonthCardDailyRewardRecord {
  prepaid?: boolean;
  day: number;
  rewardDate: string;
  status: 'claimable' | 'claimed' | 'upcoming';
}

export interface MonthCardDailyRewardStatusData {
  prepaidCount?: number;
  reviewRequired?: boolean;
  total: number;
  claimableCount: number;
  claimedCount: number;
  upcomingCount: number;
  dailyRewards: MonthCardDailyRewardDefinition;
  records: MonthCardDailyRewardRecord[];
}

export interface MonthCardDailyRewardClaimResult {
  days: number;
  rewards: {
    spiritCrystal: number;
    mentalPill: number;
    qiPill: number;
  };
}
