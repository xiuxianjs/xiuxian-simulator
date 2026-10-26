import { getBackendKillGodRanking } from '@src/api/bot/shaqi-queries';
import type { KillGodRankingQueryData } from '@src/api/schemas/shaqi-query';
import { logger } from 'alemonjs';

type KillGodListResult =
  | {
      code: 'OK';
      data: KillGodRankingQueryData;
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<KillGodListResult> {
  try {
    const data = await getBackendKillGodRanking(params.bid, params.uid);

    return { code: 'OK', data };
  } catch (error) {
    logger.error('[杀神榜] 错误:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看杀神榜失败，请稍后再试' } };
  }
}
