export interface ShaQiQueryData {
  shaQi: number;
  onKillGodList: boolean;
  killGodThreshold: number;
  dailyDecayAmount: number;
  jinpenReduceAmount: number;
}
export interface KillGodRankingQueryData {
  list: Array<{ rank: number; uid: number; name: string; shaQi: number }>;
  shaQiInfo: ShaQiQueryData | null;
  robberyRemaining: number;
  robberyDailyMax: number;
  streak: number;
  streakBonusPercent: number;
  streakText: string;
  killGodThreshold: number;
  rankingRuleText: string;
  hasKillGodTitle: boolean;
  canClaimTitle: boolean;
}
