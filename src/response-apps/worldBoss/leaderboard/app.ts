import { getBackendWorldBossRanking } from '@src/api/bot/world-boss-ranking-queries';
import { worldBossRankingView } from '@src/response/worldBoss/view';
import { logger } from 'alemonjs';

export type LeaderboardEntry = {
  rank: number;
  name: string;
  damage: string;
};

export type WorldBossLeaderboardData = {
  stageName: string;
  ranking: LeaderboardEntry[];
  myRank: number | null;
  myDamage: string;
};

export type WorldBossLeaderboardResult = { code: 'OK'; data: WorldBossLeaderboardData } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number }): Promise<WorldBossLeaderboardResult> {
  try {
    const facts = await getBackendWorldBossRanking(params.bid, params.uid);

    if (!facts.available) {
      return { code: 'LOAD_FAILED', data: { message: facts.unavailableMessage } };
    }

    return { code: 'OK', data: worldBossRankingView(facts) };
  } catch (error) {
    logger.error('查询凶兽排行失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '查询排行失败' }
    };
  }
}
