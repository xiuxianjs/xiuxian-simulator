import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { PlayerShopOwnQueryData } from '../schemas/player-shop-own';

export async function getBackendOwnPlayerShop(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<PlayerShopOwnQueryData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'post_players_id_market_shop_overview_ensure', { path: { id: uid }, ...context });

  return parseBackendOwnPlayerShop(data);
}

export function parseBackendOwnPlayerShop(value: unknown): PlayerShopOwnQueryData {
  const data = value as PlayerShopOwnQueryData | null;

  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    ![data.shopId, data.userId, data.heatScore, data.totalSales, data.totalVolume, data.activeListings].every(Number.isSafeInteger) ||
    ![data.ownerName, data.shopName, data.description].every(value => value === null || typeof value === 'string') ||
    ![data.level, data.status].every(value => value === null || Number.isSafeInteger(value)) ||
    typeof data.levelName !== 'string'
  ) {
    throw new Error('店铺查询响应不完整');
  }

  return data;
}
