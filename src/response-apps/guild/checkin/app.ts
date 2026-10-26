import { postBackendGuildCheckin } from '@src/api/bot/guild-checkin';
import type { BackendRequestContext } from '@src/api/bot/context';
import { getBackendGuildAccess } from '@src/api/bot/queries';

type AppResult =
  | { code: 'OK'; data: { message: string } }
  | { code: 'NOT_IN_GUILD'; data: { message: string; canCreateOrApplyGuild: boolean } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; request?: BackendRequestContext; repeatCommand?: string }): Promise<AppResult> {
  try {
    const result = await postBackendGuildCheckin(params.bid, params.uid, params.request, params.repeatCommand);

    return { code: 'OK', data: { message: result.message } };
  } catch (error: any) {
    if (error?.code === 'GUILD_NOT_MEMBER') {
      try {
        const access = await getBackendGuildAccess(params.bid, params.uid);

        return { code: 'NOT_IN_GUILD', data: { message: error.message, canCreateOrApplyGuild: access.ok } };
      } catch (accessError: any) {
        return { code: 'LOAD_FAILED', data: { message: accessError?.message ?? '宗门资格查询失败' } };
      }
    }

    if (error?.code === 'GUILD_ALREADY_CHECKED_IN') {
      return { code: 'OK', data: { message: error.message } };
    }

    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '签到失败' } };
  }
}
