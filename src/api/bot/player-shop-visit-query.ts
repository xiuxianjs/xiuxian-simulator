import { assertPlayerShopInfo } from '../schemas/player-shop-visit-query';
import { assertMarketBrowseItem } from '../schemas/market-browse-item';
import { requestBackend } from './client';
import type { BackendRequestContext } from './context';
import type { PlayerShopVisitData } from '../schemas/player-shop-visit-query';

const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const date = (value: unknown): boolean => typeof value === 'string' && Number.isFinite(Date.parse(value));

function assertVisitShop(data: unknown): asserts data is PlayerShopVisitData {
  const value = data as Partial<PlayerShopVisitData> | null;

  if (
    !record(value) ||
    !value ||
    !record(value.currencies) ||
    !Array.isArray(value.items) ||
    !record(value.pagination) ||
    (value.shop !== null && !record(value.shop))
  ) {
    throw new Error('逛店响应不完整');
  }
  const currencies = value.currencies;

  if (
    !['spiritStone', 'spiritsCrystal', 'spiritsMilk', 'signInCoin', 'towerScore', 'reputation', 'tongxin', 'greenBottle'].every(key => integer(currencies[key])
    ) ||
    ![value.pagination.currentPage, value.pagination.totalPages, value.pagination.total].every(integer)
  ) {
    throw new Error('逛店响应不完整');
  }
  if (value.shop !== null) {
    assertPlayerShopInfo(value.shop, '逛店响应不完整');
  }
  for (const item of value.items) {
    assertMarketBrowseItem(item, '逛店响应不完整');
    if (!integer(item.status) || (item.lockedUntil !== null && !date(item.lockedUntil))) {
      throw new Error('逛店响应不完整');
    }
  }
}

export async function getBackendPlayerShopVisit(
  bid: string | undefined,
  uid: number,
  ownerId: number,
  page: number,
  request?: BackendRequestContext
): Promise<PlayerShopVisitData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_market_shops_ownerId_browse', {
    path: { id: uid, ownerId },
    query: { page },
    ...(request?.requestId ? { requestId: request.requestId } : {})
  });

  return parseBackendPlayerShopVisit(data);
}

export function parseBackendPlayerShopVisit(data: unknown): PlayerShopVisitData {
  assertVisitShop(data);

  return data;
}
