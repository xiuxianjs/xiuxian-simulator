import { getBackendOwnPlayerShop } from '@src/api/bot/player-shop-own';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

type MyShopResult = { code: 'OK'; data: { shop: any } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; request?: BackendRequestContext }): Promise<MyShopResult> {
  try {
    const data = await getBackendOwnPlayerShop(params.bid, params.uid, params.request);
    const shop = data;

    return { code: 'OK', data: { shop } };
  } catch (error) {
    logger.error('我的小店失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '获取店铺信息失败，请稍后再试' } };
  }
}
