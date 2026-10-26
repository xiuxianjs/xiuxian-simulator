import { requestBackend } from './client';
import type { GuildShopAutoRefreshData } from '../schemas/guild-shop-auto-refresh';

export function parseGuildShopAutoRefresh(value: unknown): GuildShopAutoRefreshData {
  const data = value as GuildShopAutoRefreshData | null;

  if (
    !data ||
    !['not_joined', 'denied', 'shop_missing', 'ready', 'updated'].includes(data.outcome) ||
    typeof data.enabled !== 'boolean' ||
    typeof data.isLeader !== 'boolean' ||
    typeof data.isViceLeader !== 'boolean' ||
    typeof data.version !== 'string' ||
    !Array.isArray(data.hours) ||
    data.hours.some(hour => !Number.isFinite(hour) || hour < 0 || hour > 23)
  ) {
    throw new Error('宗门自动刷新配置响应不完整');
  }

  return data;
}
export async function getBackendGuildAutoRefresh(bid: string | undefined, uid: number, forWrite = false) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = forWrite
    ? await requestBackend(bid, 'get_players_id_guild_shop_auto_refresh_write_context', { path: { id: uid } })
    : await requestBackend(bid, 'get_players_id_guild_shop_auto_refresh', { path: { id: uid } });

  return parseGuildShopAutoRefresh(data);
}
export async function getBackendGuildLeadership(bid: string | undefined, uid: number) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_guild_leadership', { path: { id: uid } });

  if (!data || typeof data.isLeader !== 'boolean' || typeof data.isViceLeader !== 'boolean') {
    throw new Error('宗门角色响应不完整');
  }

  return data;
}
