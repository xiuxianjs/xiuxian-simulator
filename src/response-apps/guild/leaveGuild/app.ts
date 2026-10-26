import { leaveBackendGuild } from '@src/api/bot/guild-member-lifecycle';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult =
  | { code: 'NO_GUILD'; data: { message: string } }
  | { code: 'FIRST_CONFIRM'; data: { guildName: string } }
  | { code: 'OK'; data: { success: boolean; message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; repeatCommand?: string; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = await leaveBackendGuild(params.bid, params.uid, params.request, params.repeatCommand);

    if (result.outcome === 'confirmation_required') {
      return { code: 'FIRST_CONFIRM', data: { guildName: result.guildName } };
    }

    return { code: 'OK', data: { success: result.outcome === 'left', message: result.message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '退出宗门失败' } };
  }
}
