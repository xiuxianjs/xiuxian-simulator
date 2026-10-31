export interface AlchemyRankingQueryData {
  self: AlchemyRankingQueryData['items'][number] | null;
  nearby: AlchemyRankingQueryData['items'];
  nextCursor?: string;
  access: { canAccess: boolean; realmName: string | null };
  items: Array<{
    rank: number;
    playerId: number;
    name: string;
    level: number;
    title: string;
    exp: number | bigint;
    totalCrafts: number | bigint;
    successCount: number | bigint;
    successRate: string;
    canLike: boolean;
  }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
