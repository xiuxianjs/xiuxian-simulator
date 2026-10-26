import { getBackendEventOverview } from '@src/api/bot/event-overview-queries';
import { logger } from 'alemonjs';

type OverviewResult =
  { code: 'OK'; data: { overview: Awaited<ReturnType<typeof getBackendEventOverview>> } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<OverviewResult> {
  try {
    const overview = await getBackendEventOverview(params.bid, params.uid);

    return { code: 'OK', data: { overview: overview ?? [] } };
  } catch (error) {
    logger.error('[限时活动总览] 错误:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看限时活动失败，请稍后再试' } };
  }
}
