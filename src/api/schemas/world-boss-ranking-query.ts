export interface WorldBossRankingQuery {
  stageLevel: number;
  stageName: string;
  available: boolean;
  unavailableMessage: string;
  ranking: { rank: number; name: string; damage: number }[];
  myRank: number | null;
  myDamage: number;
}
