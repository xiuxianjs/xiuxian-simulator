import { requestBackend } from './client';
import type { PopularityQueryEntry } from '../schemas/popularity-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('人气榜接口格式不完整');
  }

  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('人气榜接口缺少文本字段');
  }

  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('人气榜接口缺少数值字段');
  }

  return value;
}
export async function getBackendPopularity(bid: string | undefined, uid: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendPopularity(await requestBackend(bid, 'get_players_id_popularity_leaderboard', { path: { id: uid } }));
}

export function parseBackendPopularity(value: unknown) {
  const data = record(value);

  if (typeof data.canUseFifthLayerFeature !== 'boolean' || !Array.isArray(data.items)) {
    throw new Error('人气榜接口资格或列表不完整');
  }
  const entry = (value: unknown): PopularityQueryEntry => {
    const row = record(value);

    return { rank: number(row.rank), uid: number(row.uid), name: text(row.name), popularity: number(row.popularity) };
  };

  if (!Array.isArray(data.nearby)) {
    throw new Error('人气榜接口缺少附近排名');
  }
  const list = data.items.map(entry);

  return {
    canUseFifthLayerFeature: data.canUseFifthLayerFeature,
    self: data.self === null ? null : entry(data.self),
    nearby: data.nearby.map(entry),
    realmName: data.realmName === null ? '未知' : text(data.realmName),
    list
  };
}

export function parseRobotPopularity(data: unknown) {
  const result = parseBackendPopularity(data);

  if (!result.canUseFifthLayerFeature) {
    throw new Error('人气排行成功响应缺少资格');
  }

  return result;
}
