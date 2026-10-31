import { exactInteger } from '../core/exact-json';
import type { BattleLeaderboardEntry, BattleLeaderboardQueryData } from '../schemas/battle-leaderboard-query';
import { requestBackend } from './client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('战力排行接口数据不完整');
  }

  return value as Record<string, unknown>;
}

function finite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('战力排行接口数据不完整');
  }

  return value;
}

function textOrNull(value: unknown): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error('战力排行接口数据不完整');
  }

  return value;
}

function entry(value: unknown): BattleLeaderboardEntry {
  const row = record(value);
  const name = row.name;

  if (name !== undefined && typeof name !== 'string') {
    throw new Error('战力排行接口数据不完整');
  }

  return {
    rank: finite(row.rank),
    uid: finite(row.uid),
    ...(name === undefined ? {} : { name }),
    power: exactInteger(row.power)
  };
}

export async function getBackendBattleLeaderboard(bid: string | undefined, uid: number, page: number, regional = false): Promise<BattleLeaderboardQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const operation = regional ? 'get_players_id_leaderboards_battle_region' : 'get_players_id_leaderboards_battle';

  return parseBackendBattleLeaderboard(await requestBackend(bid, operation, { path: { id: uid }, query: { page } }));
}

export function parseBackendBattleLeaderboard(value: unknown): BattleLeaderboardQueryData {
  const result = record(value);
  const access = record(result.access);

  if (typeof access.ok !== 'boolean' || typeof access.canUseSpar !== 'boolean') {
    throw new Error('战力排行接口缺少资格');
  }
  const output: BattleLeaderboardQueryData = {
    access: {
      ok: access.ok,
      canUseSpar: access.canUseSpar,
      realmName: textOrNull(access.realmName),
      region: textOrNull(access.region)
    },
    leaderboard: null
  };

  if (!output.access.ok) {
    if (result.leaderboard !== null) {
      throw new Error('战力排行资格与榜单不一致');
    }

    return output;
  }
  const board = record(result.leaderboard);

  if (!Array.isArray(board.list) || !Array.isArray(board.nearby) || typeof board.building !== 'boolean' || typeof board.complete !== 'boolean') {
    throw new Error('战力排行接口缺少榜单');
  }
  output.leaderboard = {
    page: finite(board.page),
    totalPages: finite(board.totalPages),
    total: finite(board.total),
    time: board.time === null ? null : finite(board.time),
    list: board.list.map(entry),
    nearby: board.nearby.map(entry),
    self: board.self === null ? null : entry(board.self),
    building: board.building,
    complete: board.complete
  };

  return output;
}

export function parseRobotBattleLeaderboard(value: unknown) {
  const result = parseBackendBattleLeaderboard(value);

  if (!result.access.ok || !result.leaderboard) {
    throw new Error('战力排行成功响应缺少榜单');
  }

  return { ...result.leaderboard, canUseSpar: result.access.canUseSpar };
}
