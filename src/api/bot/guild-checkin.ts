import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

import type { GuildCheckinData } from '../schemas/guild-checkin';
export type { GuildCheckinData } from '../schemas/guild-checkin';

export async function postBackendGuildCheckin(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<GuildCheckinData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_guild_checkin', {
    path: { id: uid },
    ...writeContext(request),
    headers: repeatPresentationHeaders(repeatCommand)
  });

  return parseGuildCheckin(data);
}
export function parseGuildCheckin(value: unknown): GuildCheckinData {
  const data = value;

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('宗门签到响应不完整');
  }
  const row = data as unknown as Record<string, unknown>;
  const keys = ['guildId', 'contributionAdded', 'prestigeAdded', 'dailyActivityAdded', 'weeklyActivityAdded', 'weeklyBonusSpiritStone', 'weeklyCheckinCount'];

  if (!keys.every(key => Number.isSafeInteger(row[key]))) {
    throw new Error('宗门签到响应不完整');
  }

  if (typeof row.message !== 'string' || !row.message) {
    throw new Error('宗门签到响应不完整');
  }

  return row as unknown as GuildCheckinData;
}
