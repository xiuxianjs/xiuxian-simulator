export interface WorldBossRewardsPreviewData {
  stageLevel: number;
  stageName: string;
  available: boolean;
  unavailableMessage: string;
  config: { bossName: string; bossTitle: string; baseDamage: number | bigint } | null;
  tiers: { tierName: string; damagePercent: number; conditionText: string; spiritStone: number | bigint; spiritCrystal: number | bigint }[];
  claimableRewardCount: number;
}
