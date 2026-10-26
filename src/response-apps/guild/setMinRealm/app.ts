import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_GUILD } from '@src/constants/messages';

type AppResult =
  | { code: 'CLEARED'; data: { message: string } }
  | { code: 'NOT_FOUND'; data: { message: string } }
  | { code: 'OK'; data: { success: boolean; message: string; realmName: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  searchTerm: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    const result = await requestGuildWorkflow(
      params.bid,
      params.uid,
      { action: 'min_realm', searchTerm: params.searchTerm },
      params.request,
      params.repeatCommand
    );

    if (!('minRealmId' in result)) {
      return { code: 'NOT_FOUND', data: { message: result.outcome === 'input_required' ? MSG_GUILD.REALM_INPUT_REQUIRED : MSG_GUILD.REALM_NOT_FOUND } };
    }
    const messages = {
      updated: result.minRealmId === null ? '已取消入宗境界限制' : `入宗最低境界已设置为：${result.realmName}`,
      not_joined: MSG_GUILD.NOT_JOINED,
      denied: MSG_GUILD.ONLY_LEADER_REALM,
      permission_failed: MSG_GUILD.PERMISSION_CHECK_FAILED,
      realm_missing: MSG_GUILD.REALM_NOT_EXISTS
    };

    if (params.searchTerm === '无' || params.searchTerm === '取消' || params.searchTerm === '不限') {
      return { code: 'CLEARED', data: { message: messages[result.outcome] } };
    }

    return { code: 'OK', data: { success: result.outcome === 'updated', message: messages[result.outcome], realmName: result.matchedRealmName ?? '' } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '设置失败' } };
  }
}
