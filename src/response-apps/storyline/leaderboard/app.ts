import { getBackendStorylineRanking } from '@src/api/bot/storyline-ranking-queries';
import type { StorylineRankingPage } from '@src/api/schemas/storyline-ranking-query';
import { logger } from 'alemonjs';

export type StorylineLeaderboardResult =
  { code: 'OK'; data: StorylineRankingPage } | { code: 'LOCKED'; data: { realmName: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; page: number }): Promise<StorylineLeaderboardResult> {
  try {
    const result = await getBackendStorylineRanking(params.bid, params.uid, params.page);

    if (!result.access.ok || !result.leaderboard) {
      return { code: 'LOCKED', data: { realmName: result.access.realmName ?? '未知' } };
    }

    return { code: 'OK', data: result.leaderboard };
  } catch (error) {
    logger.error('查询主线排行榜失败:', error);

    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '查询主线排行榜失败' } };
  }
}
