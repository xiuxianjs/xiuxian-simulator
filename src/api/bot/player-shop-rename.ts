import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { PlayerShopRenameResult } from '../schemas/player-shop-rename';

export async function renameBackendPlayerShop(
  bid: string | undefined,
  uid: number,
  name: string,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<PlayerShopRenameResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'put_players_id_market_shop_name', {
    headers: repeatPresentationHeaders(repeatCommand),
    path: { id: uid },
    body: { name },
    ...context
  });

  if (data?.outcome === 'renamed' && typeof data.name === 'string') {
    return data;
  }
  if (data && ['empty', 'too_short', 'too_long', 'invalid_characters', 'name_taken'].includes(data.outcome) && data.name === null) {
    return data;
  }
  throw new Error('店铺命名响应不完整');
}
