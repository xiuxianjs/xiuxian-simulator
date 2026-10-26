import { requestBackend } from './client';
import type { GuildWeeklyTaskQueryData } from '@src/api/schemas/guild-weekly-task-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门周常数据不完整');
  }

  return value as Record<string, unknown>;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export async function getBackendGuildWeeklyTask(bid: string | undefined, uid: number): Promise<GuildWeeklyTaskQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = record(await requestBackend(bid, 'get_players_id_guild_tasks_type', { path: { id: uid, type: 'weekly' } }));

  return parseGuildWeeklyTask(data);
}
export function parseGuildWeeklyTask(value: unknown): GuildWeeklyTaskQueryData {
  const data = record(value);
  const numeric = [
    'guildId',
    'contributionPoints',
    'weeklyActivity',
    'weeklyActivityMax',
    'stipendThreshold',
    'stipendPreviewAmount',
    'stipendBaseAmount',
    'stipendGuildLevel',
    'weeklyCheckinCount',
    'weeklyMiningCount',
    'weeklyExchangeCount'
  ];

  if (
    typeof data.guildName !== 'string' ||
    !numeric.every(key => Number.isSafeInteger(data[key])) ||
    !['stipendLevelMultiplier', 'stipendActivityMultiplier'].every(key => finite(data[key])) ||
    !Array.isArray(data.milestones) ||
    !Array.isArray(data.weeklyTasks) ||
    typeof data.claimAllAvailable !== 'boolean'
  ) {
    throw new Error('宗门周常数据不完整');
  }
  const taskKeys = ['checkin', 'mining', 'exchange'];

  if (data.weeklyTasks.length !== taskKeys.length) {
    throw new Error('宗门周常任务数据不完整');
  }
  for (const [index, item] of data.weeklyTasks.entries()) {
    const task = record(item);

    if (
      task.key !== taskKeys[index] ||
      typeof task.label !== 'string' ||
      !Number.isSafeInteger(task.progress) ||
      !Number.isSafeInteger(task.target) ||
      typeof task.unit !== 'string' ||
      !Number.isSafeInteger(task.activityReward) ||
      typeof task.bonusText !== 'string' ||
      typeof task.completed !== 'boolean'
    ) {
      throw new Error('宗门周常任务数据不完整');
    }
  }
  for (const item of data.milestones) {
    const milestone = record(item);

    if (
      !Number.isSafeInteger(milestone.id) ||
      !Number.isSafeInteger(milestone.threshold) ||
      (milestone.description !== null && typeof milestone.description !== 'string') ||
      typeof milestone.claimed !== 'boolean' ||
      typeof milestone.canClaim !== 'boolean'
    ) {
      throw new Error('宗门周常里程碑数据不完整');
    }
  }

  return data as unknown as GuildWeeklyTaskQueryData;
}
