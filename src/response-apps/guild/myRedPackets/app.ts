import { getBackendGuildMyRedPackets } from '@src/api/bot/guild-my-red-packets-queries';
import type { GuildMyRedPacketsQueryData } from '@src/api/schemas/guild-my-red-packets-query';

type AppResult =
  | { code: 'NO_GUILD'; data: { message: string } }
  | { code: 'OK'; data: { guildName: string; packets: GuildMyRedPacketsQueryData['packets'] } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid: string | undefined; uid: number }): Promise<AppResult> {
  try {
    const result = await getBackendGuildMyRedPackets(params.bid, params.uid);

    if (!result.hasGuild) {
      return { code: 'NO_GUILD', data: { message: '你还没有加入宗门。' } };
    }

    return { code: 'OK', data: { guildName: result.guildName !== null && result.guildName !== '' ? result.guildName : '未知宗门', packets: result.packets } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取红包列表失败' } };
  }
}
