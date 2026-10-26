import { presentAlchemyLeaderboard } from '@src/utils/alchemyQueryPresentation';
import { getBackendAlchemyRanking } from '@src/api/bot/alchemy-ranking-queries';
import type { CodeResult } from '@src/types/result';
import { logger } from 'alemonjs';

export type AlchemyLeaderboardData = {
  self: Awaited<ReturnType<typeof getBackendAlchemyRanking>>['self'];
  nearby: AlchemyLeaderboardData['items'];
  currentUid: number;
  total: number;
  page: {
    current: number;
    total: number;
  };
  items: Array<{
    rank: number;
    uid: number;
    name: string;
    level: number;
    title: string;
    exp: number;
    totalCrafts: number;
    successRate: string;
    canLike: boolean;
  }>;
};

export type AlchemyLeaderboardResult = CodeResult<'OK', 'LOAD_FAILED', AlchemyLeaderboardData> | { code: 'LOCKED'; realmName: string };

export default async function App(params: { bid?: string; uid?: number; page: number; pageSize: number }): Promise<AlchemyLeaderboardResult> {
  try {
    const currentUid = params.uid ?? 0;
    const result = await getBackendAlchemyRanking(params.bid, currentUid, params.page, params.pageSize);

    if (!result.access.canAccess) {
      return { code: 'LOCKED', realmName: result.access.realmName ?? '未知' };
    }

    return presentAlchemyLeaderboard(result, currentUid);
  } catch (error) {
    logger.error('查询丹师排行榜失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
