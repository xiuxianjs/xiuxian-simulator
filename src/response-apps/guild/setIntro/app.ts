import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_GUILD } from '@src/constants/messages';

type AppResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  intro: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    const result = await requestGuildWorkflow(
      params.bid,
      params.uid,
      { action: 'content_update', field: 'intro', content: params.intro },
      params.request,
      params.repeatCommand
    );
    const messages = {
      updated: '宗门简介设置成功',
      too_long: MSG_GUILD.INTRO_TOO_LONG,
      empty: MSG_GUILD.INTRO_EMPTY,
      inappropriate: MSG_GUILD.INTRO_INAPPROPRIATE,
      not_joined: MSG_GUILD.NOT_JOINED,
      permission_denied: MSG_GUILD.ONLY_VICE_OR_ABOVE,
      permission_check_failed: MSG_GUILD.PERMISSION_CHECK_FAILED
    };

    return { code: 'OK', data: { message: messages[result.outcome] } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '设置简介失败' } };
  }
}
