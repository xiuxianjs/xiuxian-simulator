export interface GuildApplicationQueryData {
  hasGuild: boolean;
  guildName: string | null;
  guildNameText: string;
  applications: Array<{
    id: number;
    guildId: number;
    guildName: string | null;
    status: number;
    createdAt: string | null;
    guildNameText: string;
    statusText: string;
    createdDateText: string;
    canCancel: boolean;
  }>;
}
