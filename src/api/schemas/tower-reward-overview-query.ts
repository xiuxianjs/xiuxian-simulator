export interface TowerRewardOverviewQueryData {
  canUseFifthLayerFeature: boolean;
  realmName: string | null;
  currentDay: number;
  userRank: number;
  maxRank: number;
  firstRewards: Array<{ ranking: number; canClaim: boolean; lingJing: number; spiritStone: number; description: string | null }>;
  monthlyClaimStatus: 'AVAILABLE' | 'NOT_RANKED' | 'ALL_CLAIMED';
  monthlyClaimable: boolean;
}
