import { cancelBackendMarketListing } from '@src/api/bot/market-cancel';
import type { BackendRequestContext } from '@src/api/bot/context';

type MarketCancelResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  listingId: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<MarketCancelResult> {
  try {
    const res = await cancelBackendMarketListing(params.bid, params.uid, params.listingId, params.request, params.messageText);

    const message = `${res.message}：${res.itemName}${res.feeAmount > 0 ? `，返还手续费${res.feeAmount}灵晶` : ''}`;

    return { code: 'OK', data: { message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '交易下架失败，请稍后再试' } };
  }
}
