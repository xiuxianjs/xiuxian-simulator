export interface CurrentMonthBet {
  id: number;
  guildId: number;
  betAmount: number;
  odds: number;
  winAmount: number;
  status: number;
  createdAt: string;
}
export interface CurrentMonthBetsData {
  anchorCompetitionId: string;
  materialized: boolean;
  readReady: boolean;
  season: null | {
    competitionId: string;
    status: number;
    registrationStartTime: string;
    registrationEndTime: string;
    knockoutEndTime: string;
    bettingStartTime: string;
    bettingEndTime: string;
    settlementTime: string;
  };
  bets: CurrentMonthBet[];
  total: number;
}
