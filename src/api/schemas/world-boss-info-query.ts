export interface WorldBossInfoQueryData {
  stageLevel: number;
  stageName: string;
  activeTimeDesc: string;
  bossStatus: 'ACTIVE' | 'UNAVAILABLE';
  canChallenge: boolean;
  rewardPendingUntilEnd: boolean;
  config: {
    bossName: string;
    bossTitle: string;
    baseHp: number | bigint;
    dailyAttempts: number;
    maxRounds: number;
    activeStartHour: number;
    activeEndHour: number;
  };
  isActive: boolean;
  hasInstance: boolean;
  totalDamage: number | bigint;
  totalAttacks: number;
  playerDamage: number | bigint;
  playerAttacks: number;
  remainingAttempts: number | 'NaN' | 'Infinity' | '-Infinity';
  playerRank: number | null;
  claimableRewardCount: number;
}
