export interface GuildCompetitionKnockoutCandidatesData {
  competitionId: string;
  score: number;
  remaining: number;
  candidates: Array<{
    teamId: number;
    guildId: number;
    guildName: string;
    score: number;
    slots: Array<{
      position: number;
      userId: number;
      name: string;
    } | null>;
  }>;
}
