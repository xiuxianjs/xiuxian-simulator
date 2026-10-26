import { parseGuildCheckin } from './guild-checkin';
import { parseGuildDailyTask } from './guild-daily-task-query';
import { parseGuildWeeklyTask } from './guild-weekly-task-query';
export function parseRobotGuildCheckin(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门签到响应不完整');
  }
  const row = value as Record<string, unknown>;

  parseGuildCheckin(row.receipt);
  if (typeof row.message !== 'string' || !row.message) {
    throw new Error('宗门签到响应不完整');
  }

  return { code: 'OK' as const, data: { message: row.message } };
}
export const parseRobotGuildDaily = (value: unknown) => ({ code: 'OK' as const, data: parseGuildDailyTask(value) });
export const parseRobotGuildWeekly = (value: unknown) => presentGuildWeekly(parseGuildWeeklyTask(value));

export function presentGuildWeekly(result: ReturnType<typeof parseGuildWeeklyTask>) {
  return {
    code: 'OK' as const,
    data: {
      guildName: result.guildName || '未知宗门',
      contributionPoints: result.contributionPoints,
      weeklyActivity: result.weeklyActivity,
      weeklyActivityMax: result.weeklyActivityMax,
      stipendThreshold: result.stipendThreshold,
      stipendPreviewAmount: result.stipendPreviewAmount,
      stipendBaseAmount: result.stipendBaseAmount,
      stipendGuildLevel: result.stipendGuildLevel,
      stipendLevelMultiplier: result.stipendLevelMultiplier,
      stipendActivityMultiplier: result.stipendActivityMultiplier,
      weeklyCheckinCount: result.weeklyCheckinCount,
      weeklyMiningCount: result.weeklyMiningCount,
      weeklyExchangeCount: result.weeklyExchangeCount,
      weeklyTasks: result.weeklyTasks,
      claimAllAvailable: result.claimAllAvailable,
      milestones: result.milestones.map(milestone => ({ ...milestone, description: milestone.description ?? '' }))
    }
  };
}
