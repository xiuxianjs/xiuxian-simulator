export interface AchievementCategoryProjectionData {
  access: { canUseFifthLayerFeature: boolean; realmName: string };
  validCategory: boolean;
  category?: string;
  label?: string;
  total: number;
  completed: number;
  claimableCount: number;
  items: Array<{ id: number; name: string; description: string; completed: boolean; rewardText: string; progressText: string }>;
}
