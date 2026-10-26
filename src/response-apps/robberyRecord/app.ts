import { robberyRecordsView } from '@src/api/bot/market-community-views';
import type { BackendRequestContext } from '@src/api/bot/context';
import type { RobberyRecordPage } from '@src/api/schemas/robbery-records';
import { logger } from 'alemonjs';

type RobberyRecordResult =
  | {
      code: 'OK';
      data: RobberyRecordPage;
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; page: number; request?: BackendRequestContext }): Promise<RobberyRecordResult> {
  try {
    const result = await robberyRecordsView(params.bid, params.uid, params.page, params.request);

    return {
      code: 'OK',
      data: result
    };
  } catch (error) {
    logger.error('[打劫记录] 错误:', error);

    return { code: 'LOAD_FAILED', data: { message: '获取打劫记录失败' } };
  }
}
