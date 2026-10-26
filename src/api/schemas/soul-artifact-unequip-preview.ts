export type SoulArtifactUnequipPreview = {
  outcome: 'equipped' | 'not_equipped';
  artifact: {
    name: string | null;
    previousLevel: number;
    totalCost: number;
    refundQuantity: number;
  } | null;
};
