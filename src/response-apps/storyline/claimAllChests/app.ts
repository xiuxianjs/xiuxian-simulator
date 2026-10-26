import { claimAllBackendStorylineChests } from '@src/api/bot/storyline-chest-claim';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type StorylineClaimAllChestsResult =
  | {
      code: 'OK';
      data: { success: boolean; message: string; details: Array<{ chapterNumber: number; chapterName: string; claimed: number[]; reward: number }> };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; request?: BackendRequestContext }): Promise<StorylineClaimAllChestsResult> {
  try {
    const result = await claimAllBackendStorylineChests(params.bid, params.uid, params.request);

    return { code: 'OK', data: { success: result.success, message: result.message, details: result.details } };
  } catch (error) {
    logger.error('一键领取宝箱失败:', error);

    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '领取失败，请稍后重试' } };
  }
}
