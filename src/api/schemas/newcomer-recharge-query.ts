export type NewcomerRechargeQueryData = {
  contentDays: number;
  isInPeriod: boolean;
  daysSinceRegistration: number;
  currentDay: number;
  todayRechargedAmount: number;
  thresholdAmount: number;
  claimedDays: number[];
  todayRewardClaimed: boolean;
  maxClaimableDay: number;
  rewards: {
    day: number;
    spiritStone: number;
    spiritCrystal: number;
    spiritMilk: number;
    items: { itemId: number; quantity: number }[];
    claimed: boolean;
    canClaim: boolean;
    rewardText: string;
    statusTag: string;
  }[];
  itemNames: Record<number, string>;
};
