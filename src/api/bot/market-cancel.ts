import { assertMarketMutationResult } from '../schemas/market-trade';
import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { MarketCancelResult } from '../schemas/market-cancel';

export async function cancelBackendMarketListing(
  bid: string | undefined,
  uid: number,
  listingId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<MarketCancelResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  const data = await requestBackend(bid, 'post_players_id_market_listings_listingId_cancel', {
    headers: repeatPresentationHeaders(repeatCommand),
    path: { id: uid, listingId },
    ...writeContext(request)
  });

  assertMarketMutationResult(data, '交易下架响应不完整');
  // Go MarketMutationResult omits feeAmount when no listing fee was paid.
  // Preserve explicit null from malformed runtime JSON for validation below.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const feeAmount = data?.feeAmount === undefined ? 0 : data.feeAmount;

  if (
    !data ||
    !Number.isSafeInteger(data.listingId) ||
    !Number.isSafeInteger(data.quantity) ||
    !Number.isSafeInteger(feeAmount) ||
    feeAmount < 0 ||
    typeof data.itemName !== 'string' ||
    typeof data.message !== 'string'
  ) {
    throw new Error('交易下架响应不完整');
  }

  return { ...data, feeAmount };
}
