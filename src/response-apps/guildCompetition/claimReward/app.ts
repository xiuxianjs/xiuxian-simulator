import { claimBackendGuildCompetitionRewards } from '@src/api/bot/guild-competition-actions';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = await claimBackendGuildCompetitionRewards(params.bid, params.request!);

    return { code: 'OK', data: { message: result.message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '领取奖励失败' } };
  }
}
