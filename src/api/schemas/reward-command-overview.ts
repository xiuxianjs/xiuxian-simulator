import type { MonthCardDailyRewardClaimResult, MonthCardDailyRewardStatusData } from './month-card-daily-rewards';
export type CheckInRitualResult = {
  accumulatedDays?: number;
  expireDate?: string;
  signedSlots?: string[];
  issued: Array<{ name: string; amount: number }>;
  ritualText: string;
};
export type MonthCardClaimOverviewData = {
  beforeTotal: number;
  claim: MonthCardDailyRewardClaimResult | null;
  status: MonthCardDailyRewardStatusData | null;
  statusError?: string;
};
export type FirstRechargeClaimOverviewData = {
  validTiers: number[];
  validTier: boolean;
  result: { issued: Array<{ type: string; name: string; amount: number }> } | null;
  claimError?: string;
};
