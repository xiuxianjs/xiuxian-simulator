import type { GuildMyRedPacketsQueryData } from '../schemas/guild-my-red-packets-query';
import { requestBackend } from './client';
export async function getBackendGuildMyRedPackets(bid: string | undefined, uid: number): Promise<GuildMyRedPacketsQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseGuildMyRedPackets(await requestBackend(bid, 'get_players_id_guild_red_packets_mine', { path: { id: uid } }));
}

export function parseGuildMyRedPackets(data: unknown): GuildMyRedPacketsQueryData {
  const value = data as GuildMyRedPacketsQueryData | null;

  if (
    !value ||
    typeof value.hasGuild !== 'boolean' ||
    (value.guildName !== null && typeof value.guildName !== 'string') ||
    !Array.isArray(value.packets) ||
    value.packets.some(
      p => !p ||
        ![p.id, p.packetCount, p.perAmount, p.status, p.claimedCount, p.recycled, p.recycleAmount].every(Number.isSafeInteger) ||
        typeof p.currencyType !== 'string' ||
        typeof p.currencyName !== 'string' ||
        typeof p.statusText !== 'string' ||
        typeof p.canRecycle !== 'boolean' ||
        (p.expiresAt !== null && (typeof p.expiresAt !== 'string' || !Number.isFinite(new Date(p.expiresAt).getTime())))
    )
  ) {
    throw new Error('红包接口数据不完整');
  }

  return value;
}
