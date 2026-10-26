import { EMPTY_STRING, FIRST_ARG_INDEX } from '@src/constants';
import { consumeBackendItem, parsePeiyuanPending, type BackendPeiyuanPending } from '@src/api/bot/consume';
import type { BackendRequestContext } from '@src/api/bot/context';

export type UsePillResult =
  | { code: 'PARAM_ERROR' }
  | { code: 'PEIYUAN_PENDING'; data: BackendPeiyuanPending }
  | { code: 'SUCCESS'; data: { effectMessage: string; remainingQuantity?: number } }
  | { code: 'FAILED'; message: string };

function parseUsePillParams(messageText: string): { itemIdOrName?: string; quantity: number } {
  const trimmed = (messageText || EMPTY_STRING).replace(/^(!|！|\/|#|＃)?服用\s*/, EMPTY_STRING).trim();
  const args = trimmed ? trimmed.split(/\s+/) : [];
  const quantityArg = args[1] ? Number.parseInt(args[1], 10) : 1;

  return { itemIdOrName: args[FIRST_ARG_INDEX], quantity: Number.isSafeInteger(quantityArg) && quantityArg > 0 ? quantityArg : 1 };
}

/** The bot parses command tokens only; Go resolves the pill template, stock and settlement. */
export default async function App(params: { bid?: string; uid: number; messageText: string; request?: BackendRequestContext }): Promise<UsePillResult> {
  const { itemIdOrName, quantity } = parseUsePillParams(params.messageText);

  if (!itemIdOrName) {
    return { code: 'PARAM_ERROR' };
  }
  try {
    const itemID = /^\d+$/.test(itemIdOrName) ? Number(itemIdOrName) : 0;
    const result = await consumeBackendItem(
      params.bid,
      params.uid,
      itemID > 0 ? { itemId: itemID, pillOnly: true, quantity } : { itemName: itemIdOrName, pillOnly: true, quantity },
      params.request
    );

    if (result.outcome === 'peiyuan_pending') {
      return { code: 'PEIYUAN_PENDING', data: parsePeiyuanPending(result.pending) };
    }
    if (result.outcome === 'consumed') {
      return { code: 'SUCCESS', data: { effectMessage: result.message, remainingQuantity: result.remainingQuantity } };
    }

    return { code: 'FAILED', message: result.message };
  } catch (error) {
    return { code: 'FAILED', message: error instanceof Error ? error.message : '服用丹药失败' };
  }
}
