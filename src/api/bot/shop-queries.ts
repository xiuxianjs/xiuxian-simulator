import { assertPlayerShopInfo } from '../schemas/player-shop-visit-query';
import { PAGE_SIZE } from '@src/constants';
import { requestBackend } from './client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('查询接口返回格式不完整');
  }

  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('查询接口缺少数值字段');
  }

  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('查询接口缺少文本字段');
  }

  return value;
}

export async function getBackendShopList(bid: string | undefined, page: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendShopList(await requestBackend(bid, 'get_market_shops', { query: { page: Math.max(1, Math.floor(page)), pageSize: PAGE_SIZE } }));
}

export function parseBackendShopList(value: unknown) {
  const result = record(value);

  if (!Array.isArray(result.items)) {
    throw new Error('查询接口缺少列表');
  }
  number(result.pageSize);

  return {
    data: result.items.map(value => {
      const row = record(value);

      assertPlayerShopInfo(row, '商店列表响应不完整');

      return { ...row, description: row.description ?? null };
    }),
    pagination: { currentPage: number(result.currentPage), totalPages: number(result.totalPages), total: number(result.total) }
  };
}

export async function getBackendShopRanking(bid: string | undefined, topN: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendShopRanking(await requestBackend(bid, 'get_market_shops_ranking', { query: { topN: Math.min(50, Math.max(1, topN)) } }));
}

export function parseBackendShopRanking(result: unknown) {
  if (!Array.isArray(result)) {
    throw new Error('查询接口缺少列表');
  }

  return result.map(value => {
    const row = record(value);

    return {
      rank: number(row.rank),
      shopName: text(row.shopName),
      ownerName: text(row.ownerName),
      heatScore: number(row.heatScore),
      levelName: text(row.levelName),
      totalSales: number(row.totalSales)
    };
  });
}
