import { applyBackendGuildCompetition } from '@src/api/bot/guild-competition-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
type AppResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };
export default async function App(params: { uid: number; bid?: string; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = await applyBackendGuildCompetition(params.bid, params.uid, params.request!);

    return { code: 'OK', data: { message: result.message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '报名失败' } };
  }
}
