import { getBackendPlayerShopVisit } from '@src/api/bot/player-shop-visit-query';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

type VisitShopResult =
  | { code: 'OK'; data: Awaited<ReturnType<typeof getBackendPlayerShopVisit>> }
  | { code: 'NO_SHOP'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  targetUid: number;
  page: number;
  request?: BackendRequestContext;
}): Promise<VisitShopResult> {
  try {
    const data = await getBackendPlayerShopVisit(params.bid, params.uid, params.targetUid, params.page, params.request);

    if (!data.shop) {
      return { code: 'NO_SHOP', data: { message: '该玩家尚未开店' } };
    }

    return { code: 'OK', data };
  } catch (error) {
    logger.error('逛店失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '获取店铺信息失败，请稍后再试' } };
  }
}
