export type BattleLeaderboardEntry = { rank: number; uid: number; name?: string; power: number };
export type BattleLeaderboardPage = {
  list: BattleLeaderboardEntry[];
  time: number | null;
  page: number;
  totalPages: number;
  total: number;
  building: boolean;
  complete: boolean;
  self: BattleLeaderboardEntry | null;
  nearby: BattleLeaderboardEntry[];
};
export type BattleLeaderboardQueryData = {
  access: { ok: boolean; canUseSpar: boolean; realmName: string | null; region: string | null };
  leaderboard: BattleLeaderboardPage | null;
};
