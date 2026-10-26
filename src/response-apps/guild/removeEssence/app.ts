import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_GUILD } from '@src/constants/messages';

type AppResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  essenceId: number;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    const result = await requestGuildWorkflow(
      params.bid,
      params.uid,
      { action: 'essence_remove', essenceId: params.essenceId },
      params.request,
      params.repeatCommand
    );
    const messages = {
      removed: '宗门精华移除成功',
      not_joined: MSG_GUILD.NOT_JOINED,
      permission_denied: MSG_GUILD.ONLY_ELDER_OR_ABOVE,
      permission_check_failed: MSG_GUILD.PERMISSION_CHECK_FAILED,
      not_found: MSG_GUILD.ESSENCE_NOT_FOUND,
      not_own: MSG_GUILD.ESSENCE_NOT_OWN,
      busy: '获取锁超时，已达到最大重试次数'
    };

    return { code: 'OK', data: { message: messages[result.outcome] } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '移除精华失败' } };
  }
}
