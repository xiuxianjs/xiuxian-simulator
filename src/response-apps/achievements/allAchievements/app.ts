import { validateBackendAchievements } from '@src/api/bot/queries';
import type { CodeResult } from '@src/types/result';
import { logger, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';

export type AllAchievementItem = {
  id: number;
  name: string;
  description: string;
  displayIndex: number;
};

export type AllAchievementsData = {
  items: AllAchievementItem[];
  page: {
    currentPage: number;
    totalPages: number;
    total: number;
  };
};

export type AllAchievementsResult = CodeResult<'OK', 'LOAD_FAILED', AllAchievementsData>;

export default async function App(params: { event: GameEvent; next: Next; page: number; pageSize: number }): Promise<AllAchievementsResult | undefined> {
  try {
    const response = await runRobotBusiness(
      params.event,
      'achievements.all',
      { page: params.page, pageSize: params.pageSize },
      (value: unknown) => validateBackendAchievements(value, false),
      params.next
    );

    if (response.handled) {
      return;
    }
    const result = response.data;

    return {
      code: 'OK',
      data: {
        items: result.achievements.map(achievement => {
          if (achievement.displayIndex === null) {
            throw new Error('所有成就缺少服务端序号');
          }

          return {
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            displayIndex: achievement.displayIndex
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
    logger.error('查询所有成就失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
