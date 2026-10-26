import { sweepBackendStoryline } from '@src/api/bot/storyline-sweep';
import type { BackendRequestContext } from '@src/api/bot/context';

export type StorylineSweepResult = { code: 'OK'; data: Awaited<ReturnType<typeof sweepBackendStoryline>> } | { code: 'FAILED'; data: { message: string } };

export default async function App(params: {
  bid: string | undefined;
  uid: number;
  chapterNumber: number;
  stageNumber: number;
  times: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<StorylineSweepResult> {
  try {
    return {
      code: 'OK',
      data: await sweepBackendStoryline(params.bid, params.uid, params.chapterNumber, params.stageNumber, params.times, params.request, params.messageText)
    };
  } catch (error) {
    return { code: 'FAILED', data: { message: error instanceof Error ? error.message : '主线扫荡失败' } };
  }
}
