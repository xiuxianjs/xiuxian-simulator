import { assertMarketBrowseItem } from '../schemas/market-browse-item';
import { requestBackend } from './client';
import type { BackendRequestContext } from './context';
import type { MarketBrowseData, MarketBrowseSort } from '../schemas/market-browse-query';

export type { MarketBrowseSort } from '../schemas/market-browse-query';

const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function assertMarketBrowse(data: unknown): asserts data is MarketBrowseData {
  const value = data as Partial<MarketBrowseData> | null;

  if (!isRecord(value) || !value || !isInteger(value.spiritsCrystal) || !isRecord(value.quota) || !Array.isArray(value.items) || !isRecord(value.pagination)) {
    throw new Error('珍宝楼浏览响应不完整');
  }
  const quota = value.quota;
  const pagination = value.pagination;

  if (![quota.dailyLimit, quota.dailyUsed, quota.remaining, pagination.currentPage, pagination.totalPages, pagination.total].every(isInteger)) {
    throw new Error('珍宝楼浏览响应不完整');
  }
  for (const item of value.items) {
    assertMarketBrowseItem(item, '珍宝楼浏览响应不完整');
  }
}

export async function getBackendMarketBrowse(
  bid: string | undefined,
  uid: number,
  query: { categoryType?: string; categorySubtype?: string; keyword?: string; sort?: MarketBrowseSort; page: number },
  request?: BackendRequestContext
): Promise<MarketBrowseData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  const data = await requestBackend(bid, 'get_players_id_market_browse', {
    path: { id: uid },
    query,
    ...(request?.requestId ? { requestId: request.requestId } : {})
  });

  return parseBackendMarketBrowse(data);
}

export function parseBackendMarketBrowse(data: unknown): MarketBrowseData {
  assertMarketBrowse(data);

  return data;
}
