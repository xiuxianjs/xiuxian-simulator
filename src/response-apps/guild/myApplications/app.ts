import { getBackendGuildApplications } from '@src/api/bot/guild-application-queries';

type AppResult =
  | { code: 'HAS_GUILD'; data: { guildName: string } }
  | {
      code: 'OK';
      data: { applications: Array<{ id: number; guildId: number; guildName: string; status: string; createdDateText: string; canCancel: boolean }> };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<AppResult> {
  try {
    const guildInfo = await getBackendGuildApplications(params.bid, params.uid);

    if (guildInfo.hasGuild) {
      return { code: 'HAS_GUILD', data: { guildName: guildInfo.guildNameText } };
    }

    const applications = guildInfo.applications.map(row => ({
      id: row.id,
      guildId: row.guildId,
      guildName: row.guildNameText,
      status: row.statusText,
      createdDateText: row.createdDateText,
      canCancel: row.canCancel
    }));

    return { code: 'OK', data: { applications } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取申请列表失败' } };
  }
}
