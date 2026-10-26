import { applyBackendGuild } from '@src/api/bot/guild-membership-mutations';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult =
  | { code: 'HAS_GUILD'; data: { guildName: string; roleName: string } }
  | { code: 'NO_GUILD'; data: { message: string } }
  | { code: 'OK'; data: { success: boolean; message: string; guildName: string; levelName: string; memberCount: number } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  guildId: number;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    const result = await applyBackendGuild(params.bid, params.uid, params.guildId, params.request, params.repeatCommand);

    return {
      code: 'OK',
      data: {
        success: true,
        message: `已向【${result.guildName}】提交加入申请，请等待审核`,
        guildName: result.guildName,
        levelName: result.levelName,
        memberCount: result.memberCount
      }
    };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '申请加入宗门失败' } };
  }
}
