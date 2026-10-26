import { leaderLeaveBackendGuild } from '@src/api/bot/guild-member-lifecycle';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };
export default async function App(params: { bid?: string; uid: number; request?: BackendRequestContext; repeatCommand?: string }): Promise<AppResult> {
  try {
    const result = await leaderLeaveBackendGuild(params.bid, params.uid, params.request, params.repeatCommand);

    return { code: 'OK', data: { message: result.message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '请假失败' } };
  }
}
