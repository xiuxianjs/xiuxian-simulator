import { getBackendGuildRedPackets } from '@src/api/bot/guild-red-packets-queries';
import type { GuildRedPacketQueryItem } from '@src/api/schemas/guild-red-packets-query';

type AppResult =
  | { code: 'NO_GUILD'; data: { message: string } }
  | { code: 'OK'; data: { guildName: string; packets: GuildRedPacketQueryItem[] } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<AppResult> {
  try {
    const result = await getBackendGuildRedPackets(params.bid, params.uid);

    if (!result.hasGuild) {
      return { code: 'NO_GUILD', data: { message: '你还没有加入宗门。' } };
    }
    const guildName = result.guildName !== null && result.guildName !== '' ? result.guildName : '未知宗门';
    const packets = result.packets;

    return { code: 'OK', data: { guildName, packets } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取红包列表失败' } };
  }
}
