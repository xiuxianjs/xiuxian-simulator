import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { GuildStipendData } from '../schemas/guild-stipend';
import type { GuildWorshipData, GuildWorshipOffer } from '../schemas/guild-worship';

export type { GuildStipendData } from '../schemas/guild-stipend';
export type { GuildWorshipData, GuildWorshipOffer } from '../schemas/guild-worship';

function settlement<T extends object>(data: unknown, keys: readonly string[], message: string, multipliers: readonly string[] = []): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(message);
  }
  const row = data as Record<string, unknown>;

  if (!keys.every(key => Number.isSafeInteger(row[key])) || !multipliers.every(key => typeof row[key] === 'number' && Number.isFinite(row[key]))) {
    throw new Error(message);
  }

  return row as unknown as T;
}

export async function postBackendGuildWorship(
  bid: string | undefined,
  uid: number,
  offer: GuildWorshipOffer,
  request?: BackendRequestContext
): Promise<GuildWorshipData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildWorship(await requestBackend(bid, 'post_players_id_guild_worship', { path: { id: uid }, body: { offer }, ...writeContext(request) }));
}

export function parseGuildWorship(value: unknown): GuildWorshipData {
  const row = settlement<GuildWorshipData>(value, ['guildId', 'cost', 'dailyActivityAdded', 'currentDailyActivity', 'contributionAdded'], '祭祀祖师响应不完整');

  if (!['灵石', '灵晶', '道晶'].includes(row.offer)) {
    throw new Error('祭祀祖师响应不完整');
  }

  if (![row.message, row.offerText, row.dailyActivityText, row.contributionText].every(value => typeof value === 'string' && value.length > 0)) {
    throw new Error('祭祀祖师响应不完整');
  }

  return row;
}

export async function postBackendGuildStipendClaim(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<GuildStipendData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildStipend(
    await requestBackend(bid, 'post_players_id_guild_stipend_claim', {
      path: { id: uid },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    })
  );
}

export function parseGuildStipend(value: unknown): GuildStipendData {
  return settlement<GuildStipendData>(value, ['guildId', 'amount', 'weeklyActivity', 'guildLevel', 'baseAmount'], '宗门俸禄响应不完整', [
    'levelMultiplier',
    'activityMultiplier'
  ]);
}
