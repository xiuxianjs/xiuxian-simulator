import { parseGameTime } from '@src/utils/gameTime';
import { validateGuardedAchievement, type AchievementLockedResult } from '@src/api/bot/achievement-robot-query';
import { validateBackendAchievements } from '@src/api/bot/queries';
import type { CodeResult } from '@src/types/result';
import { logger, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';

export type MyAchievementItem = {
  name: string;
  description: string;
  completedAt: string | null;
};

export type MyAchievementsData = {
  items: MyAchievementItem[];
  page: {
    currentPage: number;
    totalPages: number;
    total: number;
  };
};

export type MyAchievementsResult = CodeResult<'OK', 'INVALID_USER' | 'LOAD_FAILED', MyAchievementsData>;

export default async function App(params: {
  event: GameEvent;
  next: Next;
  page: number;
  pageSize: number;
}): Promise<MyAchievementsResult | AchievementLockedResult | undefined> {
  try {
    const response = await runRobotBusiness(
      params.event,
      'achievements.completed',
      { page: params.page, pageSize: params.pageSize },
      (value: unknown) => validateGuardedAchievement(value, (value: unknown) => validateBackendAchievements(value, true)),
      params.next
    );

    if (response.handled) {
      return;
    }
    if (response.data.locked) {
      return { code: 'LOCKED', data: { realmName: response.data.realmName } };
    }
    const result = response.data.data;

    return {
      code: 'OK',
      data: {
        items: result.achievements.map(userAchievement => {
          const achievement = userAchievement;

          return {
            name: achievement.name ?? '未知成就',
            description: achievement.description ?? '暂无描述',
            completedAt: parseGameTime(userAchievement.completedAt)?.toISOString() ?? null
          };
        }),
        page: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          total: result.total
        }
      }
    };
  } catch (error) {
    logger.error('查询我的成就失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
