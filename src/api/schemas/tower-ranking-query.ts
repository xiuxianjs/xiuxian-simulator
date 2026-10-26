export interface TowerRankingItem {
  rank: number;
  playerId: number;
  name: string;
  totalStars: number;
  highestLayer: number;
}
export interface TowerRankingPage {
  page: number;
  total: number;
  totalPages: number;
  list: TowerRankingItem[];
  self: TowerRankingItem | null;
  nearby: TowerRankingItem[];
}
export interface TowerRankingQueryData {
  access: { ok: boolean; realmName: string | null };
  leaderboard: TowerRankingPage | null;
}
