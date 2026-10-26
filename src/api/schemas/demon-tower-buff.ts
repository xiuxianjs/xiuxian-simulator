export type DemonTowerBuffOption = {
  key: string;
  label: string;
  cnKey: string;
};

export type DemonTowerBuffSelectionResult = {
  count: number;
  buffApplied: string;
  newBuffs: { hp: number; atk: number; critDmg: number };
  remainingBuffSelections: number;
  buffOptions: DemonTowerBuffOption[];
};
