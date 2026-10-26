export type SoulArtifactEquipPreviewStat = {
  key: string;
  value: number;
  isPercent: boolean;
};

export type SoulArtifactEquipPreviewItem = {
  instanceId: number;
  name: string;
  gradeId: number;
  level: number;
  panels: SoulArtifactEquipPreviewStat[];
};

export type SoulArtifactEquipPreview = {
  found: boolean;
  needsConfirmation: boolean;
  target: SoulArtifactEquipPreviewItem | null;
  current: SoulArtifactEquipPreviewItem | null;
  refundQuantity: number;
  currentGradeName: string;
  targetGradeName: string;
  comparisonLines: string[];
  refundLine: string;
};

export type SoulArtifactEquipResult = {
  artifact: {
    id: number;
    artifactId: number;
    name: string;
    category: string;
    gradeId: number;
    level: number;
    washCount: number;
    isEquipped: boolean;
    isListed: boolean;
  };
  separated: {
    name: string | null;
    previousLevel: number;
    refundQuantity: number;
  } | null;
};
