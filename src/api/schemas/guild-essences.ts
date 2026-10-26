export interface GuildEssenceQueryItem {
  id: number;
  content: string;
  creatorName: string | null;
  createdAt: string | null;
}
export interface GuildEssencesQueryResult {
  hasMembership: boolean;
  guildName: string | null;
  items: GuildEssenceQueryItem[];
  page: number;
  total: number;
  totalPages: number;
}
