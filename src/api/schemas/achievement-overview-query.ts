export interface AchievementOverviewQueryData {
  access: { canUseFifthLayerFeature: boolean; realmName: string };
  summary: { totalAchievements: number; completedAchievements: number; completionRate: number };
  totalClaimable: number;
  canClaimAll: boolean;
  categories: Array<{
    category: string;
    label: string;
    command: string | null;
    total: number;
    completed: number;
    completionRate: number;
    claimableCount: number;
    hasClaimable: boolean;
  }>;
}
