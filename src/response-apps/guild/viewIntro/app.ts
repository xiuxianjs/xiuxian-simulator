import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_GUILD } from '@src/constants/messages';

type AppResult =
  | { code: 'FAIL'; data: { message: string } }
  | { code: 'OK'; data: { guildName: string; intro: string | null } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; repeatCommand?: string; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = await requestGuildWorkflow(params.bid, params.uid, { action: 'content' }, params.request, params.repeatCommand);

    if (!result.hasMembership) {
      return { code: 'FAIL', data: { message: MSG_GUILD.NOT_JOINED } };
    }

    return { code: 'OK', data: { guildName: result.guildName ?? '', intro: result.intro ?? null } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '查询简介失败' } };
  }
}
