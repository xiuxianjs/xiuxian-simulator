export type TowerRewardQueryAccess = {
  canUseFifthLayerFeature: boolean;
  realmName: string | null;
  isOpen: boolean;
  openStartDay: number;
  openEndDay: number;
};
export type TowerFirstRewardsQueryData = TowerRewardQueryAccess & {
  userRank: number;
  maxRank: number;
  rewards: { ranking: number; state: 'CLAIMED' | 'CLAIMABLE' | 'REACHABLE' | 'LOCKED'; description?: string }[];
  hasClaimableReward: boolean;
};
export type TowerMonthlyRewardsQueryData = TowerRewardQueryAccess & {
  currentRank: number;
  bestRank: number | null;
  maxRank: number;
  claimCount: number;
  bestClaimRank: number | null;
  claimStatus: 'AVAILABLE' | 'NOT_RANKED' | 'ALL_CLAIMED';
  rewards: { id: number; rankingStart: number; rankingEnd: number; lingJing: number; spiritStone: number; state: 'CLAIMED' | 'CLAIMABLE' | 'LOCKED' }[];
  hasClaimableReward: boolean;
};
