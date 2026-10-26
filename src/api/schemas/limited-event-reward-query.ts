export type LimitedEventRewardQueryNames = {
  itemNames: Record<number, string>;
  equipmentNames: Record<number, string>;
  skillNames: Record<number, string>;
  recipeNames: Record<number, string>;
  soulArtifactNames: Record<number, string>;
  titleNames: Record<number, string>;
};
export type LimitedEventRewardQueryFields = {
  rewardSpiritStone: number;
  rewardSpiritCrystal: number;
  rewardSpiritMilk: number;
  rewardCheckInCoin: number;
  rewardTowerScore: number;
  rewardReputation: number;
  rewardTongxin: number;
  rewardPaidToken: number;
  rewardFreeToken: number;
  rewardItemsJson: string | null;
  rewardEquipmentsJson: string | null;
  rewardSkillsJson: string | null;
  rewardRecipesJson: string | null;
  rewardSoulArtifactsJson: string | null;
  rewardTitlesJson: string | null;
};
