export type DemonTowerChallengeMilestone = {
  id: number;
  stars: number;
  score: number;
};

export type DemonTowerChallengeBuff = {
  key: string;
  label: string;
  minStars: number;
  cnKey: string;
};

/** A buff the server enabled by itself; the player can still switch it. */
export type DemonTowerAutoBuff = {
  key: string;
  label: string;
  cnKey: string;
  minStars: number;
  revokePath: string;
};

/** A buff the player cannot reach yet, with the exact star shortfall. */
export type DemonTowerLockedBuff = {
  key: string;
  label: string;
  cnKey: string;
  minStars: number;
  shortBy: number;
};

/** Server-decided 配置型 (config) or hard-gate gap for the layer buff. */
export type DemonTowerBuffGap = {
  kind: 'config' | 'hardGate';
  missingName: string;
  reason: string;
  required: number;
  available: number;
  candidates: DemonTowerChallengeBuff[];
  preselected?: DemonTowerChallengeBuff;
  locked: DemonTowerLockedBuff[];
  pendingBuffSelections: number;
  cumulativeStars: number;
  recoverPath: string;
};

export type DemonTowerChallengeResult = {
  logId?: string;
  success: boolean;
  starsEarned: number;
  scoreEarned: number;
  totalTowerScore: number;
  spiritStoneEarned: number;
  talentSpiritStoneBonus?: number;
  milestonesTriggered: DemonTowerChallengeMilestone[];
  layerCleared: boolean;
  allCleared: boolean;
  nextLayer: number;
  nextStage: number;
  cumulativeStars: number;
  needSelectBuff: boolean;
  availableBuffs: DemonTowerChallengeBuff[];
  /** Set when the server filled a pending layer buff on its own. */
  autoBuff?: DemonTowerAutoBuff;
  /** Structured gap returned instead of a bare "请先选择层间 Buff". */
  buffNeeded?: DemonTowerBuffGap;
  condition: 'ROUND_LIMIT' | 'HP_THRESHOLD' | 'NO_SKILLS';
  conditionLabel: string;
  battleWinner: 'A' | 'B' | 'draw' | '';
  battleRounds: number;
};
