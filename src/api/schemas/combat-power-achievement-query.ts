export interface CombatPowerAchievementCard {
  id: number;
  name: string;
  description: string;
  threshold: number | bigint;
  rewardText: string;
}

export interface CombatPowerAchievementQueryData {
  currentPower: number | bigint;
  totalCount: number;
  completedCount: number;
  claimableCount: number;
  currentClaimable: (CombatPowerAchievementCard & { remainingClaimableCount: number }) | null;
  nextTarget: (CombatPowerAchievementCard & { remainingPower: number | bigint }) | null;
  allCompleted: boolean;
  items: Array<CombatPowerAchievementCard & { completed: boolean; claimed: boolean; reachable: boolean }>;
}
