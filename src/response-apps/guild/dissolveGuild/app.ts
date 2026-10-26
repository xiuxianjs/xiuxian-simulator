import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult =
  | { code: 'NOT_JOINED'; data: { message: string } }
  | { code: 'FIRST_CONFIRM'; data: { guildName: string } }
  | { code: 'OK'; data: { success: boolean; message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; repeatCommand?: string; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = await requestGuildWorkflow(params.bid, params.uid, { action: 'dissolve' }, params.request, params.repeatCommand);

    if (result.outcome === 'not_joined') {
      return { code: 'NOT_JOINED', data: { message: '您还没有加入任何宗门' } };
    }
    if (result.outcome === 'confirmation_required') {
      return { code: 'FIRST_CONFIRM', data: { guildName: result.guildName } };
    }

    return { code: 'OK', data: { success: true, message: result.message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '解散宗门失败' } };
  }
}
