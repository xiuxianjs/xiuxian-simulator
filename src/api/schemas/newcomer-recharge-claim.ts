export type NewcomerRechargeClaimData = {
  dayIndex: number;
  reward: {
    spiritStone: number;
    spiritCrystal: number;
    spiritMilk: number;
    itemIds: string;
  };
  itemNames: Record<number, string>;
  rewardText: string;
};
