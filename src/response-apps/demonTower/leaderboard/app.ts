import { getBackendTowerRanking } from '@src/api/bot/tower-ranking-queries';

export default async function App(params: { bid?: string; uid: number; page: number }) {
  const result = await getBackendTowerRanking(params.bid, params.uid, params.page);

  if (!result.access.ok || !result.leaderboard) {
    return { code: 'LOCKED' as const, data: { realmName: result.access.realmName ?? '未知' } };
  }

  return {
    code: 'OK' as const,
    data: {
      ...result.leaderboard,
      nearby: result.leaderboard.nearby.map(row => ({ ...row, uid: row.playerId })),
      list: result.leaderboard.list.map(row => ({ ...row, uid: row.playerId }))
    }
  };
}
