import { requestBackend } from './client';
import type { AchievementCategoryProjectionData } from '../schemas/achievement-category-projection';

export async function getBackendAchievementCategoryProjection(bid: string, uid: number, keyword: string): Promise<AchievementCategoryProjectionData> {
  const data = await requestBackend(bid, 'get_players_id_achievements_category_projection', { path: { id: uid }, query: { keyword } });

  return validateBackendAchievementCategoryProjection(data);
}

export function validateBackendAchievementCategoryProjection(data: unknown): AchievementCategoryProjectionData {
  if (!data || typeof data !== 'object') {
    throw new Error('成就分类投影响应不完整');
  }
  const row = data as unknown as Record<string, unknown>;
  const access = row.access as Record<string, unknown>;

  if (
    !access ||
    typeof access.canUseFifthLayerFeature !== 'boolean' ||
    typeof access.realmName !== 'string' ||
    typeof row.validCategory !== 'boolean' ||
    !Number.isInteger(row.total) ||
    !Number.isInteger(row.completed) ||
    !Number.isInteger(row.claimableCount) ||
    !Array.isArray(row.items)
  ) {
    throw new Error('成就分类投影响应不完整');
  }
  if (row.validCategory && (typeof row.category !== 'string' || typeof row.label !== 'string')) {
    throw new Error('成就分类投影响应不完整');
  }
  if (
    row.items.some(
      item => !item ||
        typeof item !== 'object' ||
        !Number.isInteger((item as Record<string, unknown>).id) ||
        typeof (item as Record<string, unknown>).name !== 'string' ||
        typeof (item as Record<string, unknown>).description !== 'string' ||
        typeof (item as Record<string, unknown>).completed !== 'boolean' ||
        typeof (item as Record<string, unknown>).rewardText !== 'string' ||
        typeof (item as Record<string, unknown>).progressText !== 'string'
    )
  ) {
    throw new Error('成就分类投影响应不完整');
  }

  return data as AchievementCategoryProjectionData;
}
