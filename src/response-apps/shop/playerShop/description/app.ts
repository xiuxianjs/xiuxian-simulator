import { updateBackendPlayerShopDescription } from '@src/api/bot/player-shop-description';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

type ShopDescriptionResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  description: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<ShopDescriptionResult> {
  try {
    await updateBackendPlayerShopDescription(params.bid, params.uid, params.description, params.request, params.messageText);

    return { code: 'OK', data: { message: '店铺简介已更新' } };
  } catch (error) {
    logger.error('更新店铺简介失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '更新简介失败，请稍后再试' } };
  }
}
