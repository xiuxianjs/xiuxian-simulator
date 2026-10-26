import { validateBackendAchievementOverview } from '@src/api/bot/achievement-overview-query';
import type { CodeResult } from '@src/types/result';
import { logger, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';

export type AchievementOverviewCategory = {
  category: string;
  label: string;
  total: number;
  completed: number;
  completionRate: number;
  command: string | null;
  claimableCount: number;
  hasClaimable: boolean;
};

export type AchievementOverviewData = {
  access: { canUseFifthLayerFeature: boolean; realmName: string };
  summary: {
    totalAchievements: number;
    completedAchievements: number;
    completionRate: number;
  };
  categories: AchievementOverviewCategory[];
  totalClaimable: number;
  canClaimAll: boolean;
};

export type AchievementOverviewResult = CodeResult<'OK', 'INVALID_USER' | 'LOAD_FAILED', AchievementOverviewData>;

export default async function App(params: { event: GameEvent; next: Next }): Promise<AchievementOverviewResult | undefined> {
  try {
    const response = await runRobotBusiness(params.event, 'achievements.overview', {}, validateBackendAchievementOverview, params.next);

    if (response.handled) {
      return;
    }
    const data = response.data;

    return {
      code: 'OK',
      data: {
        access: data.access,
        summary: data.summary,
        categories: data.categories,
        totalClaimable: data.totalClaimable,
        canClaimAll: data.canClaimAll
      }
    };
  } catch (error) {
    logger.error('查询成就总览失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
