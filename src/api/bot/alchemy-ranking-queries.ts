import type { AlchemyRankingQueryData } from '../schemas/alchemy-ranking-query';
import { requestBackend } from './client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('丹师排行接口数据不完整');
  }

  return value as Record<string, unknown>;
}
function integer(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value);
}
export async function getBackendAlchemyRanking(bid: string | undefined, uid: number, page: number, pageSize: number): Promise<AlchemyRankingQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_alchemy_leaderboard', { path: { id: uid }, query: { page, pageSize } });

  return parseAlchemyRanking(data);
}

export function parseAlchemyRanking(data: unknown): AlchemyRankingQueryData {
  const result = record(data);
  const access = record(result.access);

  if (
    typeof access.canAccess !== 'boolean' ||
    (access.realmName !== null && typeof access.realmName !== 'string') ||
    !Array.isArray(result.items) ||
    !Array.isArray(result.nearby) ||
    !Number.isSafeInteger(result.page) ||
    Number(result.page) < 1 ||
    !Number.isSafeInteger(result.totalPages) ||
    Number(result.totalPages) < 1 ||
    Number(result.page) > Number(result.totalPages) ||
    !Number.isSafeInteger(result.pageSize) ||
    Number(result.pageSize) < 1 ||
    !Number.isSafeInteger(result.total) ||
    Number(result.total) < 0
  ) {
    throw new Error('丹师排行接口数据不完整');
  }
  for (const value of [...result.items, ...(result.nearby as unknown[]), ...(result.self === null ? [] : [result.self])]) {
    const row = record(value);

    if (
      !['rank', 'playerId', 'level', 'exp', 'totalCrafts', 'successCount'].every(key => integer(row[key])) ||
      !['name', 'title', 'successRate'].every(key => typeof row[key] === 'string') ||
      typeof row.canLike !== 'boolean'
    ) {
      throw new Error('丹师排行接口数据不完整');
    }
  }

  return result as unknown as AlchemyRankingQueryData;
}
