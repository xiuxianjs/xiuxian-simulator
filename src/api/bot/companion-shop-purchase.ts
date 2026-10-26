import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type CompanionShopPurchasePreview = {
  productId: number;
  name: string;
  unitPrice: number;
  totalPrice: number;
  grantQuantity: number;
  count: number;
};

export type CompanionShopPurchaseSettlement = {
  name: string;
  paid: string;
  granted: number;
  buyCount: number;
};

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const positiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

export async function previewBackendCompanionShopPurchase(
  bid: string | undefined,
  uid: number,
  productId: number,
  count: number,
  request?: BackendRequestContext
): Promise<CompanionShopPurchasePreview> {
  if (!bid) {
    throw new Error('兑换请求缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_companion_shop_purchases_preview', {
    path: { id: uid },
    body: { productId, count },
    requestId: request?.requestId
  });

  return parseBackendCompanionShopPreview(data);
}

export function parseBackendCompanionShopPreview(data: unknown): CompanionShopPurchasePreview {
  if (
    !record(data) ||
    !positiveInteger(data.productId) ||
    typeof data.name !== 'string' ||
    ![data.unitPrice, data.totalPrice].every(integer) ||
    !positiveInteger(data.grantQuantity) ||
    !positiveInteger(data.count)
  ) {
    throw new Error('道侣商店预检响应不完整');
  }

  return data as CompanionShopPurchasePreview;
}

export async function purchaseBackendCompanionShop(
  bid: string | undefined,
  uid: number,
  productId: number,
  count: number,
  request?: BackendRequestContext
): Promise<CompanionShopPurchaseSettlement> {
  if (!bid) {
    throw new Error('兑换请求缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_companion_shop_purchases', {
    path: { id: uid },
    body: { productId, count },
    ...writeContext(request)
  });

  if (!record(data) || typeof data.name !== 'string' || typeof data.paid !== 'string' || ![data.granted, data.buyCount].every(integer)) {
    throw new Error('道侣商店结算响应不完整');
  }

  return data;
}
