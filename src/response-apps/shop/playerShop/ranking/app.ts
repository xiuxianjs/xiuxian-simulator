import { getBackendShopRanking } from '@src/api/bot/shop-queries';
import { logger } from 'alemonjs';

type ShopRankingResult =
  { code: 'OK'; data: { ranking: Awaited<ReturnType<typeof getBackendShopRanking>> } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; limit: number }): Promise<ShopRankingResult> {
  try {
    const ranking = await getBackendShopRanking(params.bid, params.limit);

    return { code: 'OK', data: { ranking } };
  } catch (error) {
    logger.error('小店排行失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '获取排行榜失败，请稍后再试' } };
  }
}
