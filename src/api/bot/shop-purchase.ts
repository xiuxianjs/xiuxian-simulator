export type ShopPurchasePreview = {
  productId: number;
  shopCode: string;
  name: string;
  paid: string;
  granted: number;
  buyCount: number;
  needsConfirmation: boolean;
};

export type ShopPurchaseSettlement = {
  name: string;
  paid: string;
  granted: number;
  buyCount: number;
};

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const positiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

export function decodeShopPreview(data: unknown): ShopPurchasePreview {
  if (
    !record(data) ||
    !positiveInteger(data.productId) ||
    typeof data.shopCode !== 'string' ||
    typeof data.name !== 'string' ||
    typeof data.paid !== 'string' ||
    !positiveInteger(data.granted) ||
    !positiveInteger(data.buyCount) ||
    typeof data.needsConfirmation !== 'boolean'
  ) {
    throw new Error('商店预检响应不完整');
  }

  return data as ShopPurchasePreview;
}
