export interface DemonTowerInfoQueryData {
  access: { ok: boolean; realmName: string };
  info: DemonTowerInfoData | null;
}

export interface DemonTowerInfoData {
  hasStarted: boolean;
  isFinished: boolean;
  currentLayer: number;
  currentStage: number;
  currentLayerStars: number;
  cumulativeStars: number;
  totalScore: number;
  totalSpiritStone: number;
  sweepableLayers: number;
  sweepableLayersText: string;
  userPower: number;
  monsterPower: { star1: number; star2: number; star3: number };
  targetLayer: number;
  buffs: { hp: number; atk: number; critDmg: number };
  buffText: string;
  conditionLabel: string;
  bestStarsByLayer: Array<{ layer: number; stars: number }>;
  maxRecordedLayer: number;
  totalBestStars: number;
  fullStarLayers: number;
  recordedLayers: number;
  milestones: { claimedCount: number; totalCount: number; next: { stars: number; score: number } | null };
  showChallengeButtons: boolean;
  showSweepButton: boolean;
  showResetButton: boolean;
  challenge: { available: boolean; reason: string };
  sweep: { available: boolean; reason: string };
  reset: { available: boolean; reason: string };
  buffSelection: { available: boolean; reason: string };
  availableBuffs: Array<{ key: string; label: string; cnKey: string; minStars: number }>;
  pendingBuffSelections: number;
  towerScore: number;
}
