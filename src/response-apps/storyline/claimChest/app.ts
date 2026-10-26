import { claimAllBackendChapterChests, claimBackendStorylineChest } from '@src/api/bot/storyline-chest-claim';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type StorylineClaimChestResult =
  | {
      code: 'OK';
      data: {
        chapterNumber: number;
        message: string;
        claimedIndexes: number[];
        success: boolean;
        chests: Array<{ index: number; requiredStars: number; reward: number; claimed: boolean; unlocked: boolean }>;
      };
    }
  | { code: 'INVALID_PARAMS' }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  uid: number;
  bid?: string;
  chapterNumber: number;
  chestIndex: number | null;
  request?: BackendRequestContext;
}): Promise<StorylineClaimChestResult> {
  if (!params.chapterNumber) {
    return { code: 'INVALID_PARAMS' };
  }

  try {
    const result =
      params.chestIndex !== null
        ? await claimBackendStorylineChest(params.bid, params.uid, params.chapterNumber, params.chestIndex, params.request)
        : await claimAllBackendChapterChests(params.bid, params.uid, params.chapterNumber, params.request);

    return {
      code: 'OK',
      data: {
        chapterNumber: result.chapterNumber,
        message: result.message,
        claimedIndexes: result.claimedIndexes,
        success: result.success,
        chests: result.chests
      }
    };
  } catch (error) {
    logger.error('领取宝箱失败:', error);

    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '领取宝箱失败，请稍后重试' } };
  }
}
