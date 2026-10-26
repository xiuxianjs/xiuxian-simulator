export interface GuildCompetitionBattleQueryData {
  hasGuild: boolean;
  hasTeams: boolean;
  records: Array<{
    id: number;
    attackerTeamId: number;
    defenderTeamId: number;
    winnerTeamId: number;
    stage: number;
    battleTime: string;
    opponentTeamId: number;
    opponentName: string | null;
    isWin: boolean;
  }>;
  page: number;
  totalPages: number;
  count: number;
}
