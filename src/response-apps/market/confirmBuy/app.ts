import type { BackendRequestContext } from '@src/api/bot/context';
import { marketWorkflow } from '@src/api/bot/market-community-views';

type ConfirmBuyResult =
  | {
      code: 'NEED_CONFIRM';
      data: {
        itemName: string;
        quantity: number;
        totalPrice: number;
        currencyName: string;
        overpriceWarning: string;
        shouldConfirm: boolean;
        listingId: number;
      };
    }
  | { code: 'OK'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  listingId: number;
  quantity: number;
  isConfirmed: boolean;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<ConfirmBuyResult> {
  try {
    const data = await marketWorkflow(
      params.bid,
      params.uid,
      { action: 'purchase', listingId: params.listingId, quantity: params.quantity, confirmed: params.isConfirmed },
      params.request,
      params.messageText
    );

    if (data.preview) {
      const preview = data.preview;

      return { code: 'NEED_CONFIRM', data: preview };
    }
    const result = data.receipt;

    if (!result || typeof result.message !== 'string') {
      throw new Error('选购响应不完整');
    }

    return { code: 'OK', data: { message: result.message } };
  } catch (error) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '选购失败，请稍后再试' } };
  }
}
