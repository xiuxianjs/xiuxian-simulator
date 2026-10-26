/** Server-interpreted cave facts; the bot retains only layout. */
export interface CaveOverviewPlot {
  plotIndex: number;
  plotState: 'cultivated' | 'unlockable' | 'locked';
  fieldGrade: number;
  seedName: string;
  seedMatureHours: number | null;
  seedStageSplit: string | null;
  cropName: string;
  baseYield: number;
  expReward: number;
  abnormalFlags: number;
  abnormalStateCount: number;
  isMature: boolean;
  plantedAt: string | null;
  matureAt: string | null;
  remainingSeconds: number;
  title: string;
  detail: string;
  capabilities: Array<{ kind: 'plant' | 'harvest' | 'care' | 'accelerate' | 'upgrade' | 'cultivate'; careAction?: 'water' | 'worm' | 'weed' }>;
}

export interface CaveOverviewFormation {
  formationKey: string;
  formationCategory: string;
  formationName: string;
  formationEffect: string;
  expiresAt: string;
}

export interface CaveOverviewQueryData {
  cultivationCostText?: string;
  plots: CaveOverviewPlot[];
  maxPlots: number;
  cultivatedCount: number;
  plantedCount: number;
  matureCount: number;
  abnormalCount: number;
  auraScore: number;
  auraLevel: string;
  auraLabel: string;
  activeFormations: CaveOverviewFormation[];
  stasisFormation?: { name: string; remainingText: string } | null;
}
