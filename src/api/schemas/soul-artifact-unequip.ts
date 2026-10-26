export type SoulArtifactUnequipResult = {
  outcome: 'unequipped' | 'not_equipped';
  artifact: {
    name: string | null;
    previousLevel: number;
    totalCost: number;
    refundQuantity: number;
  } | null;
};
