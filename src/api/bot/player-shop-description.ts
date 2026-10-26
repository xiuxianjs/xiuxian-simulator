import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { PlayerShopDescriptionUpdateResult } from '../schemas/player-shop-description';

export async function updateBackendPlayerShopDescription(
  bid: string | undefined,
  uid: number,
  description: string,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<PlayerShopDescriptionUpdateResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'put_players_id_market_shop_description', {
    headers: repeatPresentationHeaders(repeatCommand),
    path: { id: uid },
    body: { description },
    ...context
  });

  if (data?.updated !== true) {
    throw new Error('店铺简介更新响应不完整');
  }

  return data;
}
