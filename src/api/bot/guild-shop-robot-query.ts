import { parseGuildShopPage } from './guild-shop-page';
import { parseGuildShopExchange } from './guild-shop-actions';
import { parseGuildWorkflow } from './guild-workflow';

export const guildShopRefreshReference = /^r1_[0-9a-z]{1,13}_j_[0-9a-z]{1,13}_[0-9a-f]{24}$/;

export function parseRobotGuildShop(value: unknown, refresh: boolean, uid: number) {
  if (!refresh) {
    return { outcome: 'shop' as const, page: parseGuildShopPage(value), receipt: null };
  }
  const row = value as Record<string, unknown> | null;

  if (row?.outcome === 'preview') {
    if (
      typeof row.reference !== 'string' ||
      !guildShopRefreshReference.test(row.reference) ||
      typeof row.cost !== 'number' ||
      !Number.isSafeInteger(row.cost) ||
      row.cost <= 0
    ) {
      throw new Error('宗门商店刷新预览不完整');
    }

    return { outcome: 'preview' as const, reference: row.reference, cost: row.cost };
  }
  const data = parseGuildWorkflow({ action: 'shop_refresh' }, uid, value);

  if (data.pageError) {
    return { outcome: 'receipt' as const, receipt: data.receipt };
  }

  return { outcome: 'shop' as const, page: parseGuildShopPage(data.page), receipt: data.receipt };
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
