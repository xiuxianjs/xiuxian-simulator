import { marketListingsView } from '@src/api/bot/market-community-views';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export default async function App(params: { bid?: string; uid: number; page: number; request?: BackendRequestContext }) {
  try {
    const data = await marketListingsView(params.bid, params.uid, params.page, params.request);

    return { code: 'OK' as const, data };
  } catch (error) {
    logger.error('查看我的上架失败:', error);

    return { code: 'LOAD_FAILED' as const, data: { message: '查看我的上架失败，请稍后再试' } };
  }
}
