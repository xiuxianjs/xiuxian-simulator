import { createBackendGuild } from '@src/api/bot/guild-membership-mutations';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult =
  | { code: 'HAS_GUILD'; data: { guildName: string; roleName: string } }
  | { code: 'INVALID_NAME'; data: { message: string } }
  | { code: 'CANNOT_CREATE'; data: { message: string } }
  | { code: 'OK'; data: { success: boolean; message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  guildName: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    const result = await createBackendGuild(params.bid, params.uid, params.guildName, params.request, params.repeatCommand);

    return { code: 'OK', data: { success: true, message: `宗门【${result.name}】创建成功，您已成为宗主` } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '创建宗门失败' } };
  }
}
