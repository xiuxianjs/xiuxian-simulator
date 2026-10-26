import { postBackendGuildMilestonesClaimAll } from '@src/api/bot/guild-milestone-claim';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult =
  | { code: 'OK'; data: { message: string; partial: boolean; claimed: Array<{ id: number; threshold: number; description: string }> } }
  | { code: 'NOTHING_TO_CLAIM' | 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  uid: number;
  type: 'daily_activity' | 'weekly_activity';
  bid?: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    const result = await postBackendGuildMilestonesClaimAll(params.bid, params.uid, params.type, params.request, params.repeatCommand);

    return { code: 'OK', data: result };
  } catch (error: any) {
    const message = error?.message ?? '一键领取失败';

    return { code: error?.code === 'GUILD_MILESTONES_NOTHING_TO_CLAIM' ? 'NOTHING_TO_CLAIM' : 'LOAD_FAILED', data: { message } };
  }
}
