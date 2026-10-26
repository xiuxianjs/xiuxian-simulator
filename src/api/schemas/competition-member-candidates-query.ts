export interface GuildCompetitionMemberCandidatesData {
  hasGuild: boolean;
  hasTeam: boolean;
  canManage: boolean;
  guildId: number;
  competitionId: string;
  teamMemberIds: number[];
  availablePositions: number[];
  members: Array<{ userId: number; name: string; power: number }>;
  page: number;
  totalPages: number;
  count: number;
}
