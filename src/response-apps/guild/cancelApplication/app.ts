import { getBackendGuildApplications } from '@src/api/bot/guild-application-queries';
import { cancelBackendGuildApplication } from '@src/api/bot/guild-application-cancel';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_GUILD } from '@src/constants/messages';

type AppResult =
  | { code: 'LIST'; data: { pendingApps: { id: number; guildId: number; guildName: string; status: string }[] } }
  | { code: 'OK'; data: { success: boolean; message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  applicationId: number | null;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    if (params.applicationId === null) {
      const result = await getBackendGuildApplications(params.bid, params.uid);
      const pendingApps = result.applications.map(row => ({
        id: row.id,
        guildId: row.guildId,
        guildName: row.guildNameText,
        status: row.statusText
      }));

      return { code: 'LIST', data: { pendingApps } };
    }

    const result = await cancelBackendGuildApplication(params.bid, params.uid, params.applicationId, params.request, params.repeatCommand);

    const message =
      result.outcome === 'not_pending' ? MSG_GUILD.APPLICATION_NOT_FOUND : result.guildExists ? `已取消对【${result.guildName}】的加入申请` : '已取消申请';

    return { code: 'OK', data: { success: result.outcome === 'cancelled', message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '取消申请失败' } };
  }
}
