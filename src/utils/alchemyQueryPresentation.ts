import type { AlchemyRankingQueryData } from '@src/api/schemas/alchemy-ranking-query';

export function presentAlchemyLeaderboard(result: AlchemyRankingQueryData, currentUid: number) {
  const entry = (item: (typeof result.items)[number]) => ({
    rank: item.rank,
    uid: item.playerId,
    name: item.name,
    level: item.level,
    title: item.title,
    exp: item.exp,
    totalCrafts: item.totalCrafts,
    successRate: item.successRate,
    canLike: item.canLike
  });

  return {
    code: 'OK' as const,
    data: {
      currentUid,
      self: result.self,
      nearby: result.nearby.map(entry),
      total: result.total,
      page: {
        current: result.page,
        total: result.totalPages
      },
      items: result.items.map(item => ({
        rank: item.rank,
        uid: item.playerId,
        name: item.name,
        level: item.level,
        title: item.title,
        exp: item.exp,
        totalCrafts: item.totalCrafts,
        successRate: item.successRate,
        canLike: item.canLike
      }))
    }
  };
}
