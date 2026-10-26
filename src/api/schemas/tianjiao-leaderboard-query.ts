export interface TianjiaoLeaderboardQuery {
  isVisible: boolean;
  canChallenge: boolean;
  lockedMessage: string;
  requiredText: string;
  suggestedTarget: number | null;
  requiredRealmName: string;
  stageLevel: number;
  stageName: string;
  myRank: number | null;
  attemptsLeft: number;
  entries: Array<{ userId?: number; rank: number; occupied: boolean; userName: string; realmName: string; power: number; isMe: boolean }>;
}
