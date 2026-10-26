export interface GuildReviewQueryData {
  hasGuild: boolean;
  guildName: string | null;
  roleName: string | null;
  canReview: boolean;
  isDeputy: boolean;
  applications: Array<{ id: number; userId: number; userName: string | null; realmName: string | null; createdAt: string | null }>;
  currentPage: number;
  totalPages: number;
  total: number;
  nextCursor?: string;
}
