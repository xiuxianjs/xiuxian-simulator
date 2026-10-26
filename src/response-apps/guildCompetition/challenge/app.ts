import { challengeBackendGuildCompetition } from '@src/api/bot/guild-competition-actions';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult = { code: 'OK'; data: { message: string; battleLogId: string | null } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; defenderGuildId: number; bid?: string; request: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = (await challengeBackendGuildCompetition(params.bid, params.uid, params.defenderGuildId, params.request)) as {
      message?: unknown;
      logId?: unknown;
    };

    return {
      code: 'OK',
      data: { message: typeof result.message === 'string' ? result.message : '挑战完成', battleLogId: typeof result.logId === 'string' ? result.logId : null }
    };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '挑战失败' } };
  }
}
