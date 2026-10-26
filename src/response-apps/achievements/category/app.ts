import { validateBackendAchievementCategoryProjection } from '@src/api/bot/achievement-category-projection';
import { displayCurrencyText } from '@src/constants/currency';
import type { AchievementCategoryProjectionData } from '@src/api/schemas/achievement-category-projection';
import type { CodeResult } from '@src/types/result';
import { logger, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';

export type AchievementCategoryDetailResult = CodeResult<'OK', 'INVALID_USER' | 'INVALID_CATEGORY' | 'LOAD_FAILED', AchievementCategoryProjectionData>;

export default async function App(params: { event: GameEvent; next: Next; keyword: string }): Promise<AchievementCategoryDetailResult | undefined> {
  try {
    const result = await runRobotBusiness(
      params.event,
      'achievements.category',
      { keyword: params.keyword },
      validateBackendAchievementCategoryProjection,
      params.next
    );

    if (result.handled) {
      return;
    }
    const data = result.data;

    if (!data.validCategory && data.access.canUseFifthLayerFeature) {
      return { code: 'INVALID_CATEGORY' };
    }

    return { code: 'OK', data: { ...data, items: data.items.map(item => ({ ...item, rewardText: displayCurrencyText(item.rewardText) })) } };
  } catch (error) {
    logger.error('查询成就分类失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
