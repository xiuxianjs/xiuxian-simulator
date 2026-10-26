import { purchaseBackendCheckInShop } from '@src/api/bot/checkin-shop-purchase';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result =
  | {
      code: 'INVALID_FORMAT';
      data: { message: string };
    }
  | {
      code: 'FAIL';
      data: { message: string };
    }
  | { code: 'OK'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  productId: number;
  buyCount: number;
  request?: BackendRequestContext;
}): Promise<Result> {
  const { bid, uid, productId, buyCount, request } = params;

  if (!Number.isSafeInteger(productId) || !Number.isSafeInteger(buyCount) || buyCount <= 0) {
    return { code: 'INVALID_FORMAT', data: { message: '格式错误，请使用：签到商店购买 序号 [数量]' } };
  }

  try {
    const result = await purchaseBackendCheckInShop(bid, uid, productId, buyCount, request);

    return {
      code: 'OK',
      data: {
        message: `【${result.playerName}】购买成功！\n💰 消耗签到币：${result.pricePaid}\n🎁 获得：${result.productName} x${result.grantQuantity}\n💳 剩余签到币：${result.signInCoin}`
      }
    };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '签到商店购买失败，请稍后再试' } };
  }
}
