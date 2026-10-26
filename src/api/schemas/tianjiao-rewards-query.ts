export interface TianjiaoRewardsQuery {
  isVisible: boolean;
  stageLevel: number;
  stageName: string;
  configs: Array<{ stageLevel: number; rank: number; description: string | null; rewardJson: unknown }>;
  records: Array<{ stageLevel: number; stageName: string; rank: number; rewardText: string | null; rewardSnapshot: unknown; claimedAt: string }>;
  view: {
    lockedMessage: string;
    tiers: Array<{ rank: number; rewardText: string; claimedAt: string | null }>;
    records: Array<{ stageLevel: number; stageName: string; rank: number; rewardText: string; claimedAt: string }>;
    recordTotal: number;
  };
}
