import { presentGuildEssences } from '@src/api/bot/guild-content-robot-query';
import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_GUILD } from '@src/constants/messages';

type AppResult = { code: 'FAIL'; data: { message: string } } | { code: 'OK'; data: { result: any } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; page: number; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = await requestGuildWorkflow(params.bid, params.uid, { action: 'essences', page: params.page }, params.request);

    if (!result.hasMembership) {
      return { code: 'FAIL', data: { message: MSG_GUILD.NOT_JOINED } };
    }

    return {
      code: 'OK',
      data: {
        result: presentGuildEssences(result)
      }
    };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '查询精华失败' } };
  }
}
