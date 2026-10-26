import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type GuildUpgradeKind = 'level' | 'vein' | 'shop';
export type GuildUpgradeData = {
  guildId: number;
  guildName: string;
  kind: GuildUpgradeKind;
  level: number;
  spiritStoneCost: number;
  prestigeCost: number;
  message: string;
};

export async function postBackendGuildUpgrade(
  bid: string | undefined,
  uid: number,
  kind: GuildUpgradeKind,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<GuildUpgradeData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_guild_upgrade', {
    path: { id: uid },
    body: { kind },
    ...writeContext(request),
    headers: repeatPresentationHeaders(repeatCommand)
  });

  return parseGuildUpgrade(data, kind);
}

export function parseGuildUpgrade(data: unknown, kind: GuildUpgradeKind): GuildUpgradeData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('宗门升级响应不完整');
  }
  const row = data as Record<string, unknown>;

  if (
    !Number.isSafeInteger(row.guildId) ||
    typeof row.guildName !== 'string' ||
    row.kind !== kind ||
    !Number.isSafeInteger(row.level) ||
    !Number.isSafeInteger(row.spiritStoneCost) ||
    !Number.isSafeInteger(row.prestigeCost) ||
    typeof row.message !== 'string' ||
    !row.message
  ) {
    throw new Error('宗门升级响应不完整');
  }

  return row as GuildUpgradeData;
}
