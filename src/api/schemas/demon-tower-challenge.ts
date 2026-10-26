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

export type DemonTowerChallengeResult = {
  logId?: string;
  success: boolean;
  starsEarned: number;
  scoreEarned: number;
  totalTowerScore: number;
  spiritStoneEarned: number;
  milestonesTriggered: DemonTowerChallengeMilestone[];
  layerCleared: boolean;
  allCleared: boolean;
  nextLayer: number;
  nextStage: number;
  cumulativeStars: number;
  needSelectBuff: boolean;
  availableBuffs: DemonTowerChallengeBuff[];
  condition: 'ROUND_LIMIT' | 'HP_THRESHOLD' | 'NO_SKILLS';
  conditionLabel: string;
  battleWinner: 'A' | 'B' | 'draw' | '';
  battleRounds: number;
};
