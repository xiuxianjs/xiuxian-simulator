import { getBackendSeclusionDisplay, type BackendSeclusionStatus } from '@src/api/bot/seclusion-status';
import { logger } from 'alemonjs';

type SeclusionInfoResult =
  | {
      code: 'OK';
      data: BackendSeclusionStatus;
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number }): Promise<SeclusionInfoResult> {
  try {
    const status = await getBackendSeclusionDisplay(params.bid, params.uid);

    return {
      code: 'OK',
      data: status
    };
  } catch (error) {
    logger.error('[探索] 查看错误:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看探索状态失败，请稍后再试' } };
  }
}
