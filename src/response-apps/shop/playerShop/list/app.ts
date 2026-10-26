import { getBackendShopList } from '@src/api/bot/shop-queries';
import { logger } from 'alemonjs';

type ShopListResult =
  | {
      code: 'OK';
      data: { data: Awaited<ReturnType<typeof getBackendShopList>>['data']; pagination: { currentPage: number; totalPages: number; total: number } };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; page: number }): Promise<ShopListResult> {
  try {
    const result = await getBackendShopList(params.bid, params.page);

    return { code: 'OK', data: result };
  } catch (error) {
    logger.error('小店列表失败:', error);
    const message = error instanceof Error ? error.message : '获取店铺列表失败';

    return { code: 'LOAD_FAILED', data: { message } };
  }
}
