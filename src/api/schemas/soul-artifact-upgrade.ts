export type SoulArtifactLevelComparison = {
  key: 'patk' | 'matk' | 'pdef' | 'mdef' | 'hp' | 'speed';
  before: number;
  after: number;
};

export type SoulArtifactLevelUpgrade = {
  artifact: { id: number; name: string; level: number };
  previousLevel: number;
  actualLevels: number;
  cost: number;
  comparison: SoulArtifactLevelComparison[];
  message: string;
  compareLines: string[];
};
