export interface GuildActivityRefreshResult {
  activityUpdated: boolean;
  impeachmentReset: boolean;
  deputyCleared: boolean;
  failed: boolean;
}
export interface GuildContentQueryResult {
  hasMembership: boolean;
  guildName: string | null;
  intro: string | null;
  notice: string | null;
}
