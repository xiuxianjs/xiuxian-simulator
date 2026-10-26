import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_GUILD } from '@src/constants/messages';

type AppResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  content: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    const result = await requestGuildWorkflow(params.bid, params.uid, { action: 'essence_add', content: params.content }, params.request, params.repeatCommand);
    const messages = {
      added: '宗门精华添加成功',
      too_long: MSG_GUILD.ESSENCE_TOO_LONG,
      empty: MSG_GUILD.ESSENCE_EMPTY,
      inappropriate: MSG_GUILD.ESSENCE_INAPPROPRIATE,
      not_joined: MSG_GUILD.NOT_JOINED,
      limit_reached: MSG_GUILD.ESSENCE_LIMIT,
      permission_denied: MSG_GUILD.ONLY_ELDER_OR_ABOVE,
      permission_check_failed: MSG_GUILD.PERMISSION_CHECK_FAILED
    };

    return { code: 'OK', data: { message: messages[result.outcome] } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '添加精华失败' } };
  }
}
