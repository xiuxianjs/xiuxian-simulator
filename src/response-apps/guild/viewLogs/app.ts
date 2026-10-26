import { PAGE_SIZE } from '@src/constants';
import { getBackendGuildLogs } from '@src/api';

type AppResult =
  | { code: 'NO_GUILD'; data: { message: string } }
  | { code: 'OK'; data: { guildName: string; logs: any[]; total: number; page: number; totalPages: number } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; page: number }): Promise<AppResult> {
  try {
    const data = await getBackendGuildLogs(params.bid, params.uid, params.page, PAGE_SIZE);

    if (!data.hasGuild) {
      return { code: 'NO_GUILD', data: { message: '您还未加入宗门' } };
    }
    const { logs, total, page, totalPages, guildName } = data;

    return {
      code: 'OK',
      data: { guildName, logs, total, page, totalPages }
    };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取日志失败' } };
  }
}
