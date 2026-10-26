export interface WorldBossRewardsPreviewData {
  stageLevel: number;
  stageName: string;
  available: boolean;
  unavailableMessage: string;
  config: { bossName: string; bossTitle: string; baseDamage: number } | null;
  tiers: { tierName: string; damagePercent: number; conditionText: string; spiritStone: number; spiritCrystal: number }[];
  claimableRewardCount: number;
}
