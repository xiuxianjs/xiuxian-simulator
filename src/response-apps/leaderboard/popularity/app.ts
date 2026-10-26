import { getBackendPopularity } from '@src/api/bot/popularity-queries';
import { logger } from 'alemonjs';

type PopularityResult = { code: 'OK'; data: Awaited<ReturnType<typeof getBackendPopularity>> } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number }): Promise<PopularityResult> {
  try {
    const data = await getBackendPopularity(params.bid, params.uid);

    return { code: 'OK', data };
  } catch (error) {
    logger.error('[人气排行榜] 错误:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看人气排行榜失败，请稍后再试' } };
  }
}
