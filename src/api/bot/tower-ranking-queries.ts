import { record, number, text } from '../schemas/ranking-values';
import type { TowerRankingQueryData } from '../schemas/tower-ranking-query';
import { requestBackend } from './client';

export async function getBackendTowerRanking(bid: string | undefined, uid: number, page: number): Promise<TowerRankingQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseTowerRanking(await requestBackend(bid, 'get_players_id_tower_leaderboard', { path: { id: uid }, query: { page } }));
}

export function parseTowerRanking(value: unknown): TowerRankingQueryData {
  const result = record(value);
  const access = record(result.access);

  if (typeof access.ok !== 'boolean') {
    throw new Error('查询接口缺少境界资格');
  }
  const eligibility = { ok: access.ok, realmName: access.realmName === null ? null : text(access.realmName) };

  if (!eligibility.ok) {
    if (result.leaderboard !== null) {
      throw new Error('查询接口资格与榜单不一致');
    }

    return { access: eligibility, leaderboard: null };
  }
  const board = record(result.leaderboard);

  if (!Array.isArray(board.list)) {
    throw new Error('查询接口缺少列表');
  }

  const entry = (value: unknown) => {
    const row = record(value);

    return {
      rank: number(row.rank),
      playerId: number(row.playerId),
      name: text(row.name),
      totalStars: number(row.totalStars),
      highestLayer: number(row.highestLayer)
    };
  };

  if (!Array.isArray(board.nearby)) {
    throw new Error('查询接口缺少附近排名');
  }

  return {
    access: eligibility,
    leaderboard: {
      page: number(board.page),
      total: number(board.total),
      totalPages: number(board.totalPages),
      list: board.list.map(entry),
      self: board.self === null ? null : entry(board.self),
      nearby: board.nearby.map(entry)
    }
  };
}
