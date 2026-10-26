import { getBackendGuildHome } from '@src/api/bot/guild-home-query';
import type { GuildHomeQueryData } from '@src/api/schemas/guild-home-query';

type AppResult =
  | { code: 'NO_GUILD'; data: { message: string; canCreateOrApplyGuild: boolean } }
  | { code: 'OK'; data: GuildHomeQueryData }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid: string | undefined; uid: number }): Promise<AppResult> {
  try {
    const data = await getBackendGuildHome(params.bid, params.uid);

    if (!data.hasGuild) {
      return { code: 'NO_GUILD', data: { message: '您还未加入任何宗门', canCreateOrApplyGuild: data.access.canCreateOrApplyGuild } };
    }
    if (!data.membership || !data.guild) {
      return { code: 'LOAD_FAILED', data: { message: '获取宗门信息失败' } };
    }

    return { code: 'OK', data };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取宗门信息失败' } };
  }
}
