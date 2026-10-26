import { parseBackendCompanionShopPreview } from './companion-shop-purchase';

export function parseRobotCompanionShopPurchase(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('道侣商店结算响应不完整');
  }
  const data = value as Record<string, unknown>;

  if (data.mode === 'preview') {
    return { mode: 'preview' as const, ...parseBackendCompanionShopPreview(data) };
  }
  if (
    data.mode !== 'result' ||
    typeof data.name !== 'string' ||
    typeof data.paid !== 'string' ||
    ![data.granted, data.buyCount].every(value => typeof value === 'number' && Number.isFinite(value))
  ) {
    throw new Error('道侣商店结算响应不完整');
  }

  return { mode: 'result' as const, name: data.name, paid: data.paid, granted: data.granted as number, buyCount: data.buyCount as number };
}
