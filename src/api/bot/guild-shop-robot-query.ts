import { parseGuildShopPage } from './guild-shop-page';
import { parseGuildShopExchange } from './guild-shop-actions';
import { parseGuildWorkflow } from './guild-workflow';

export function parseRobotGuildShop(value: unknown, refresh: boolean, uid: number) {
  if (!refresh) {
    return { page: parseGuildShopPage(value), receipt: null };
  }
  const data = parseGuildWorkflow({ action: 'shop_refresh' }, uid, value);

  return { page: parseGuildShopPage(data.page), receipt: data.receipt };
}

export function parseRobotGuildShopExchange(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门商店兑换响应不完整');
  }
  const data = value as Record<string, unknown>;

  if (data.outcome === 'usage') {
    return { outcome: 'usage' as const };
  }
  if (data.outcome !== 'result') {
    throw new Error('宗门商店兑换响应不完整');
  }

  return { outcome: 'result' as const, receipt: parseGuildShopExchange(data.receipt) };
}
