import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { GuildMiningData } from '../schemas/guild-mining';

export type { GuildMiningData } from '../schemas/guild-mining';

export async function postBackendGuildMining(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<GuildMiningData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildMining(
    await requestBackend(bid, 'post_players_id_guild_mining', {
      path: { id: uid },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    })
  );
}

export function parseGuildMining(value: unknown): GuildMiningData {
  const data = value as GuildMiningData | null;

  if (
    !data ||
    !['started', 'in_progress', 'settled'].includes(data.outcome) ||
    typeof data.message !== 'string' ||
    typeof data.guildName !== 'string' ||
    typeof data.started !== 'boolean' ||
    typeof data.capReached !== 'boolean' ||
    ![
      data.guildId,
      data.veinLevel,
      data.miningQuota,
      data.remainingSeconds,
      data.settledHours,
      data.spiritStoneAdded,
      data.contributionAdded,
      data.dailyActivityAdded
    ].every(Number.isSafeInteger)
  ) {
    throw new Error('宗门采矿响应不完整');
  }

  return data;
}
