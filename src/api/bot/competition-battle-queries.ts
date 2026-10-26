import type { GuildCompetitionBattleQueryData } from '../schemas/competition-battle-query';
import { requestBackend } from './client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门大比战斗记录接口数据不完整');
  }

  return value as Record<string, unknown>;
}
const integer = (value: unknown, minimum: number): boolean => Number.isSafeInteger(value) && Number(value) >= minimum;

export async function getBackendCompetitionBattles(bid: string | undefined, uid: number, page: number): Promise<GuildCompetitionBattleQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseCompetitionBattles(await requestBackend(bid, 'get_players_id_guild_competition_battles', { path: { id: uid }, query: { page } }));
}

export function parseCompetitionBattles(value: unknown): GuildCompetitionBattleQueryData {
  const data = record(value);

  if (
    typeof data.hasGuild !== 'boolean' ||
    typeof data.hasTeams !== 'boolean' ||
    !integer(data.page, 1) ||
    !integer(data.totalPages, 1) ||
    !integer(data.count, 0) ||
    !Array.isArray(data.records)
  ) {
    throw new Error('宗门大比战斗记录接口数据不完整');
  }
  for (const value of data.records) {
    const row = record(value);

    if (
      !integer(row.id, 1) ||
      !integer(row.attackerTeamId, 0) ||
      !integer(row.defenderTeamId, 0) ||
      !integer(row.winnerTeamId, 0) ||
      !integer(row.opponentTeamId, 0) ||
      !Number.isSafeInteger(row.stage) ||
      typeof row.battleTime !== 'string' ||
      !Number.isFinite(new Date(row.battleTime).getTime()) ||
      (row.opponentName !== null && typeof row.opponentName !== 'string') ||
      typeof row.isWin !== 'boolean'
    ) {
      throw new Error('宗门大比战斗记录接口数据不完整');
    }
  }

  return data as unknown as GuildCompetitionBattleQueryData;
}
