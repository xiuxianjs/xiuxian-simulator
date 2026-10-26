export interface WeeklyRebateQueryData {
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
