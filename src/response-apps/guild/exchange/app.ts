import { exchangeBackendGuildShopByIndex } from '@src/api/bot/guild-shop-actions';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult =
  | { code: 'OK'; data: { itemName: string; quantity: number; prestigeGain: number; remainingDailyCount: number } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  itemIndex: number;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    const result = await exchangeBackendGuildShopByIndex(params.bid, params.uid, params.itemIndex, params.request, params.repeatCommand);

    return {
      code: 'OK',
      data: { itemName: result.itemName, quantity: result.quantity, prestigeGain: result.prestigeGain, remainingDailyCount: result.remainingDailyCount }
    };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '兑换失败' } };
  }
}
