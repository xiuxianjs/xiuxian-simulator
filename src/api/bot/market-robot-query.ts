import { assertMarketPurchasePreview } from '../schemas/market-trade';
import type { BackendMarketPurchasePreview } from './market-trade';
import { parseBackendMarketBrowse } from './market-browse-query';
import type { MarketBrowseData } from '../schemas/market-browse-query';

export type RobotMarketBrowse = { view: 'guide'; spiritsCrystal: number | null } | ({ view: 'browse' } & MarketBrowseData);

export function parseRobotMarketBrowse(value: unknown, expected: 'guide' | 'browse'): RobotMarketBrowse {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('view' in value) || value.view !== expected) {
    throw new Error('珍宝楼浏览响应不完整');
  }
  if (expected === 'guide') {
    const balance = 'spiritsCrystal' in value ? value.spiritsCrystal : undefined;

    if (balance !== null && (typeof balance !== 'number' || !Number.isSafeInteger(balance))) {
      throw new Error('货币余额响应不完整');
    }

    return { view: 'guide', spiritsCrystal: balance };
  }

  return { ...parseBackendMarketBrowse(value), view: 'browse' };
}

export function parseRobotMarketMessage(value: unknown): { message: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('message' in value) || typeof value.message !== 'string') {
    throw new Error('市场操作响应不完整');
  }

  return { message: value.message };
}

export function parseRobotMarketPurchase(value: unknown): { preview: BackendMarketPurchasePreview } | { message: string } {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'preview' in value) {
    assertMarketPurchasePreview(value.preview, '市场购买预览响应不完整');

    return { preview: value.preview };
  }

  return parseRobotMarketMessage(value);
}

export function parseRobotMarketFishDetail(value: unknown, listingId: number) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('鱼类详情响应不完整');
  }
  const { itemName, catchId, weightG, fishRealmName, unitPriceAmount, currencyName, sellerName } = value as Record<string, unknown>;

  if (!('listingId' in value) || value.listingId !== listingId ||
      typeof itemName !== 'string' || !itemName ||
      typeof catchId !== 'string' || !/^[A-Za-z0-9_.:-]{1,40}$/.test(catchId) ||
      typeof weightG !== 'number' || !Number.isSafeInteger(weightG) || weightG < 1 ||
      typeof fishRealmName !== 'string' || !fishRealmName ||
      typeof unitPriceAmount !== 'number' || !Number.isSafeInteger(unitPriceAmount) || unitPriceAmount < 1 ||
      typeof currencyName !== 'string' || !currencyName ||
      typeof sellerName !== 'string' || !sellerName) {
    throw new Error('鱼类详情响应不完整');
  }

  return { itemName, catchId, weightG, fishRealmName, unitPriceAmount, currencyName, sellerName };
}
