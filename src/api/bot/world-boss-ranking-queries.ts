import { exactInteger } from '../core/exact-json';
import { requestBackend } from './client';
import type { WorldBossRankingQuery } from '../schemas/world-boss-ranking-query';

function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('凶兽排行缺少数值字段');
  }

  return value;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('凶兽排行数据不完整');
  }

  return value as Record<string, unknown>;
}
export async function getBackendWorldBossRanking(bid: string | undefined, uid: number): Promise<WorldBossRankingQuery> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseWorldBossRanking(await requestBackend(bid, 'get_players_id_leaderboards_world_boss', { path: { id: uid } }));
}
export function parseWorldBossRanking(value: unknown): WorldBossRankingQuery {
  const data = record(value);

  if (!Array.isArray(data.ranking)) {
    throw new Error('凶兽排行缺少列表');
  }

  return {
    stageLevel: integer(data.stageLevel),
    stageName:
      typeof data.stageName === 'string'
        ? data.stageName
        : (() => {
            throw new Error('凶兽排行境界字段不完整');
          })(),
    available:
      typeof data.available === 'boolean'
        ? data.available
        : (() => {
            throw new Error('凶兽排行资格字段不完整');
          })(),
    unavailableMessage:
      typeof data.unavailableMessage === 'string'
        ? data.unavailableMessage
        : (() => {
            throw new Error('凶兽排行资格提示字段不完整');
          })(),
    myRank: data.myRank === null ? null : integer(data.myRank),
    myDamage: exactInteger(data.myDamage),
    ranking: data.ranking.map(value => {
      const row = record(value);

      if (typeof row.name !== 'string') {
        throw new Error('凶兽排行昵称字段不完整');
      }

      return { rank: integer(row.rank), damage: exactInteger(row.damage), name: row.name };
    })
  };
}
