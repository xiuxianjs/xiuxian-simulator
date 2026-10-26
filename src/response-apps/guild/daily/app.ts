import { getBackendGuildDailyTask, type GuildDailyTaskQueryData } from '@src/api/bot/guild-daily-task-query';

type AppResult =
  | { code: 'NO_GUILD'; data: { message: string } }
  | {
      code: 'OK';
      data: GuildDailyTaskQueryData;
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<AppResult> {
  try {
    const result = await getBackendGuildDailyTask(params.bid, params.uid);

    return { code: 'OK', data: result };
  } catch (error: any) {
    if (error?.code === 'GUILD_NOT_MEMBER') {
      return { code: 'NO_GUILD', data: { message: error.message } };
    }

    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取宗门日常失败' } };
  }
}
