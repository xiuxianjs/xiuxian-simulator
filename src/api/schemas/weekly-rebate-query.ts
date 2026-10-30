export const WEEKLY_CUMULATIVE_MODE = 'weekly_cumulative' as const;
export const WEEKLY_CUMULATIVE_RULES = 'weekly-rebate-v2-cumulative-20261030' as const;
export const WEEKLY_CUMULATIVE_THRESHOLDS = [30, 68, 128, 198, 328, 488, 648] as const;

export interface LegacyWeeklyRebateQueryData {
  mode?: undefined;
  eligible: boolean;
  minAccountDays: number;
  dailyThresholdAmount: number;
  daysSinceRegistration: number;
  todayDayOfWeek: number;
  todayLabel: string;
  weekStart: string;
  todayRechargedAmount: number;
  todayRechargedYuan: number;
  todayRechargeText: string;
  thresholdYuan: number;
  claimedDays: number[];
  canClaimToday: boolean;
  canClaimBonus: boolean;
  rewards: {
    day: number;
    label: string;
    statusTag: string;
    spiritStone: number;
    spiritCrystal: number;
    spiritMilk: number;
    items: { itemId: number; quantity: number; name: string | null }[];
    canClaim: boolean;
    rewardText: string;
  }[];
}

export interface CumulativeWeeklyRebateQueryData {
  mode: typeof WEEKLY_CUMULATIVE_MODE;
  rulesVersion: typeof WEEKLY_CUMULATIVE_RULES;
  eligible: boolean;
  minAccountDays: number;
  daysSinceRegistration: number;
  weekStart: string;
  periodStart: string;
  periodEnd: string;
  deadlineText: string;
  weekRechargedAmount: number;
  weekRechargedYuan: number;
  weekRechargeText: string;
  claimedAmounts: number[];
  loop: {
    baseAmount: number;
    stepAmount: number;
    itemId: number;
    name: string;
    quantity: number;
    totalCount: number;
    claimedCount: number;
    claimableCount: number;
    expectedLoopCount: number;
    canClaim: boolean;
    configured: boolean;
    statusTag: string;
    rewardText: string;
  };
  rewards: {
    thresholdAmount: number;
    thresholdYuan: number;
    label: string;
    configured: boolean;
    claimed: boolean;
    canClaim: boolean;
    remainingAmount: number;
    remainingText: string;
    statusTag: string;
    spiritStone: number;
    spiritCrystal: number;
    spiritMilk: number;
    items: { itemId: number; quantity: number; name: string | null }[];
    rewardText: string;
  }[];
}

export type WeeklyRebateQueryData = LegacyWeeklyRebateQueryData | CumulativeWeeklyRebateQueryData;
