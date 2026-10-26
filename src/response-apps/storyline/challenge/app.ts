import { startBackendStorylineChallenge, type StorylineManualBattleState } from '@src/api/bot/storyline-manual-battle';
import type { BackendRequestContext } from '@src/api/bot/context';

export type StorylineChallengeResult = { code: 'OK'; data: StorylineManualBattleState } | { code: 'FAILED'; data: { message: string } };

// Resolving chapter/stage numbers is a catalogue lookup only. All access,
// membership, combat and settlement decisions are made by the manual-battle API.
export default async function App(params: {
  bid: string;
  uid: number;
  chapterNumber: number;
  stageNumber: number;
  request: BackendRequestContext;
}): Promise<StorylineChallengeResult> {
  try {
    return { code: 'OK', data: await startBackendStorylineChallenge(params.bid, params.uid, params.chapterNumber, params.stageNumber, params.request) };
  } catch (error) {
    return { code: 'FAILED', data: { message: error instanceof Error ? error.message : '主线挑战失败' } };
  }
}
