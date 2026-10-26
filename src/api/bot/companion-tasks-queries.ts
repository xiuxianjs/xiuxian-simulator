import { requestBackend } from './client';
import type { CompanionTasksQueryData } from '@src/api/schemas/companion-tasks-query';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const taskType = (value: unknown): value is CompanionTasksQueryData['tasks'][number]['taskType'] => value === 'dual_cultivation' || value === 'dungeon' || value === 'gift' || value === 'care_farm';

export async function getBackendCompanionTasks(bid: string | undefined, uid: number): Promise<CompanionTasksQueryData> {
  if (!bid?.trim()) {
    throw new Error('查询缺少平台身份');
  }
  const data: unknown = await requestBackend(bid, 'get_players_id_companion_tasks', { path: { id: uid } });

  return parseCompanionTasks(data);
}

export function parseCompanionTasks(data: unknown): CompanionTasksQueryData {
  if (
    !record(data) ||
    !record(data.access) ||
    typeof data.access.canUseFifthLayerFeature !== 'boolean' ||
    (data.access.realmName !== null && typeof data.access.realmName !== 'string') ||
    typeof data.hasCompanion !== 'boolean' ||
    !Array.isArray(data.tasks)
  ) {
    throw new Error('道侣任务数据不完整');
  }
  const tasks = data.tasks.map<CompanionTasksQueryData['tasks'][number]>(task => {
    if (
      !record(task) ||
      !taskType(task.taskType) ||
      !integer(task.limit) ||
      !integer(task.completedCount) ||
      !integer(task.earnedTongxin) ||
      !Array.isArray(task.rewardAmounts) ||
      !task.rewardAmounts.every(integer)
    ) {
      throw new Error('道侣任务字段不完整');
    }

    return {
      taskType: task.taskType,
      limit: task.limit,
      completedCount: task.completedCount,
      earnedTongxin: task.earnedTongxin,
      rewardAmounts: [...task.rewardAmounts]
    };
  });

  return { access: { canUseFifthLayerFeature: data.access.canUseFifthLayerFeature, realmName: data.access.realmName }, hasCompanion: data.hasCompanion, tasks };
}
