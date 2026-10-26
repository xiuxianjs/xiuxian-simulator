import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type RecordValue = Record<string, unknown>;

export type BackendCheckInShopPurchase = {
  productId: number;
  productName: string;
  buyCount: number;
  pricePaid: number;
  grantQuantity: number;
  playerName: string;
  signInCoin: number;
  issued: Array<{ type: string; name: string; amount: number }>;
};

function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('签到商店购买响应不完整');
  }

  return value as RecordValue;
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`签到商店购买响应字段无效: ${field}`);
  }

  return value;
}

function string(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`签到商店购买响应字段无效: ${field}`);
  }

  return value;
}

export async function purchaseBackendCheckInShop(
  bid: string | undefined,
  uid: number,
  productId: number,
  buyCount: number,
  request?: BackendRequestContext
): Promise<BackendCheckInShopPurchase> {
  if (
    !bid?.trim() ||
    !Number.isSafeInteger(uid) ||
    uid <= 0 ||
    !Number.isSafeInteger(productId) ||
    productId <= 0 ||
    !Number.isSafeInteger(buyCount) ||
    buyCount <= 0
  ) {
    throw new Error('签到商店购买参数无效');
  }

  const data = record(
    await requestBackend(bid, 'post_players_id_check_in_shop_products_productId_purchase', {
      path: { id: uid, productId },
      body: { buyCount },
      ...writeContext(request)
    })
  );

  if (!Array.isArray(data.issued)) {
    throw new Error('签到商店购买响应缺少发放记录');
  }

  return {
    productId: nonNegativeInteger(data.productId, 'productId'),
    productName: string(data.productName, 'productName'),
    buyCount: nonNegativeInteger(data.buyCount, 'buyCount'),
    pricePaid: nonNegativeInteger(data.pricePaid, 'pricePaid'),
    grantQuantity: nonNegativeInteger(data.grantQuantity, 'grantQuantity'),
    playerName: string(data.playerName, 'playerName'),
    signInCoin: nonNegativeInteger(data.signInCoin, 'signInCoin'),
    issued: data.issued.map(value => {
      const issued = record(value);

      if (typeof issued.type !== 'string' || typeof issued.name !== 'string') {
        throw new Error('签到商店购买发放记录无效');
      }

      return { type: issued.type, name: issued.name, amount: nonNegativeInteger(issued.amount, 'issued.amount') };
    })
  };
}
