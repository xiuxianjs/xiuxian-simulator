import { presentGuildWeekly } from '@src/api/bot/guild-daily-robot-query';
import { getBackendGuildWeeklyTask } from '@src/api/bot/guild-weekly-task-query';
import type { GuildWeeklyMilestoneQueryItem, GuildWeeklyTaskProgressItem } from '@src/api/schemas/guild-weekly-task-query';

type MilestoneItem = GuildWeeklyMilestoneQueryItem;

type AppResult =
  | { code: 'NO_GUILD'; data: { message: string } }
  | {
      code: 'OK';
      data: {
        guildName: string;
        contributionPoints: number;
        weeklyActivity: number;
        weeklyActivityMax: number;
        stipendThreshold: number;
        stipendPreviewAmount: number;
        stipendBaseAmount: number;
        stipendGuildLevel: number;
        stipendLevelMultiplier: number;
        stipendActivityMultiplier: number;
        weeklyCheckinCount: number;
        weeklyMiningCount: number;
        weeklyExchangeCount: number;
        weeklyTasks: GuildWeeklyTaskProgressItem[];
        claimAllAvailable: boolean;
        milestones: MilestoneItem[];
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<AppResult> {
  try {
    const result = await getBackendGuildWeeklyTask(params.bid, params.uid);

    return presentGuildWeekly(result);
  } catch (error: any) {
    if (error?.status === 409 || error?.code === 'CONFLICT') {
      return { code: 'NO_GUILD', data: { message: '你还没有加入宗门。' } };
    }

    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取宗门周常失败' } };
  }
}
