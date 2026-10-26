export interface StorylineRankingItem {
  rank: number;
  uid: number;
  name: string;
  totalStars: number;
}
export interface StorylineRankingPage {
  nextCursor?: string;
  page: number;
  total: number;
  totalPages: number;
  items: StorylineRankingItem[];
  self: StorylineRankingItem | null;
  nearby: StorylineRankingItem[];
}
export interface StorylineRankingQueryData {
  access: { ok: boolean; realmName: string | null };
  leaderboard: StorylineRankingPage | null;
}
