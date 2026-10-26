import { requestBackend } from './client';
import type { AchievementOverviewQueryData } from '../schemas/achievement-overview-query';

const message = '成就总览响应不完整';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(message);
  }

  return value;
}
function rate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(message);
  }

  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error(message);
  }

  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(message);
  }

  return value;
}

export async function getBackendAchievementOverview(bid: string, uid: number): Promise<AchievementOverviewQueryData> {
  return validateBackendAchievementOverview(await requestBackend(bid, 'get_players_id_achievements_overview', { path: { id: uid } }));
}

export function validateBackendAchievementOverview(data: unknown): AchievementOverviewQueryData {
  const row = record(data);
  const access = record(row.access);
  const summary = record(row.summary);

  if (!Array.isArray(row.categories)) {
    throw new Error(message);
  }

  return {
    access: { canUseFifthLayerFeature: boolean(access.canUseFifthLayerFeature), realmName: text(access.realmName) },
    summary: {
      totalAchievements: count(summary.totalAchievements),
      completedAchievements: count(summary.completedAchievements),
      completionRate: rate(summary.completionRate)
    },
    totalClaimable: count(row.totalClaimable),
    canClaimAll: boolean(row.canClaimAll),
    categories: row.categories.map(value => {
      const item = record(value);

      return {
        category: text(item.category),
        label: text(item.label),
        command: item.command === null ? null : text(item.command),
        total: count(item.total),
        completed: count(item.completed),
        completionRate: rate(item.completionRate),
        claimableCount: count(item.claimableCount),
        hasClaimable: boolean(item.hasClaimable)
      };
    })
  };
}
