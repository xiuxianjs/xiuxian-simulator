import { likeBackendPopularity } from '@src/api/bot/popularity-like';
import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

type LikeResult =
  | { code: 'OK'; data: { success: boolean; message: string; currentPopularity?: number; remainingLikes?: number; boardLabel?: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  uid: number;
  bid?: string;
  targetUid: number;
  boardType: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<LikeResult> {
  try {
    const result = await likeBackendPopularity(params.bid, params.uid, params.targetUid, params.boardType, params.request, params.messageText);

    return {
      code: 'OK',
      data: {
        success: true,
        message: result.message,
        currentPopularity: result.currentPopularity,
        remainingLikes: result.remainingLikes,
        boardLabel: result.boardLabel
      }
    };
  } catch (error) {
    logger.error('[人气点赞] 错误:', error);

    if (error instanceof BackendAPIError && error.status !== undefined && error.status < 500) {
      return {
        code: 'OK',
        data: { success: false, message: error.message }
      };
    }

    return { code: 'LOAD_FAILED', data: { message: '人气点赞失败，请稍后再试' } };
  }
}
