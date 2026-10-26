export interface GeneralAchievementQueryData {
  items: { id: number; name: string | null; description: string | null; rewardJson: string | null; completed: boolean; claimed: boolean }[];
  itemNames: Record<string, string | null>;
}
