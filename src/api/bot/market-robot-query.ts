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
