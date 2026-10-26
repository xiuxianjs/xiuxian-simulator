import { renameBackendGuild } from '@src/api/bot/guild-rename';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; name: string; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = await renameBackendGuild(params.bid, params.uid, params.name, params.request);
    const messages = {
      renamed: `改名成功，宗门名称已更新为：${result.guildName ?? params.name}`,
      too_short: '宗门名称至少需要2个字',
      too_long: '宗门名称不能超过6个字',
      invalid_characters: '宗门名称只能包含中文、英文和数字',
      inappropriate: '宗门名称包含不适当的内容',
      name_taken: '该宗门名称已被占用',
      not_joined: '您还没有宗门\n无法使用改名功能',
      permission_denied: '仅宗主可以改名',
      rename_card_missing: '宗门改名失败：更名卡配置缺失，请联系运营',
      rename_card_insufficient: '宗门改名失败：物品数量不足'
    };

    return { code: 'OK', data: { message: messages[result.outcome] } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '宗门改名失败，请稍后再试' } };
  }
}
