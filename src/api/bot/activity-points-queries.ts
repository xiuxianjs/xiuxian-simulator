import { requestBackend } from './client';
import type { ActivityPointsQueryData } from '@src/api/schemas/activity-points-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('活跃度数据不完整');
  }

  return value as Record<string, unknown>;
}
function numbers(row: Record<string, unknown>, keys: string[]) {
  return keys.every(key => typeof row[key] === 'number' && Number.isFinite(row[key]));
}
function texts(row: Record<string, unknown>, keys: string[]) {
  return keys.every(key => typeof row[key] === 'string');
}
export function parseBackendActivityPoints(value: unknown, type: 'daily' | 'weekly'): ActivityPointsQueryData {
  const row = record(value);

  if (row.treasureMapsUnavailableReason !== undefined && typeof row.treasureMapsUnavailableReason !== 'string') {
    throw new Error('周活藏宝图状态不完整');
  }

  if (
    row.rewardType !== type ||
    (row.taskRewardsCanClaim !== undefined && typeof row.taskRewardsCanClaim !== 'boolean') ||
    typeof row.cyclePeriod !== 'string' ||
    !numbers(row, ['currentPoints']) ||
    !Array.isArray(row.tasks) ||
    !Array.isArray(row.rewards)
  ) {
    throw new Error('活跃度数据不完整');
  }
  for (const value of row.tasks) {
    const task = record(value);

    if (
      !numbers(task, ['taskId', 'activityPoints', 'targetValue', 'currentValue', 'rewardQuantity']) ||
      !texts(task, ['name', 'description', 'actionKey', 'rewardName']) ||
      typeof task.completed !== 'boolean'
    ) {
      throw new Error('活跃任务数据不完整');
    }
  }
  for (const value of row.rewards) {
    const reward = record(value);

    if (
      !numbers(reward, ['requiredPoints', 'quantity', 'itemId']) ||
      !texts(reward, ['name', 'category', 'currencyCode']) ||
      typeof reward.claimed !== 'boolean' ||
      typeof reward.canClaim !== 'boolean'
    ) {
      throw new Error('活跃奖励数据不完整');
    }
    if (
      (reward.treasureMapQuantity !== undefined && (!Number.isSafeInteger(reward.treasureMapQuantity) || Number(reward.treasureMapQuantity) < 0)) ||
      ['treasureMapGranted', 'treasureMapClaimable', 'treasureMapBackfillOnly'].some(key => reward[key] !== undefined && typeof reward[key] !== 'boolean')
    ) {
      throw new Error('周活藏宝图状态不完整');
    }
  }

  return row as unknown as ActivityPointsQueryData;
}

export async function getBackendActivityPoints(bid: string | undefined, uid: number, type: 'daily' | 'weekly'): Promise<ActivityPointsQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendActivityPoints(await requestBackend(bid, 'get_players_id_activities_rewardType', { path: { id: uid, rewardType: type } }), type);
}
