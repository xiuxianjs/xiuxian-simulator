export interface MarketCredibilityInitializeResult {
  created: boolean;
}
export interface MarketCredibilityInfo {
  baseScore: number;
  vipBonus: number;
  monthCardBonus: number;
  activityScore: number;
  totalScore: number;
  threshold: number;
  isAboveThreshold: boolean;
  dailyFreeCancelLimit: number;
  maxScore: number;
  progressBar: string;
  statusText: string;
}
