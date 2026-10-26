import { challengeBackendGuildStoryline, type GuildStorylineChallenge } from '@src/api/bot/guild-storyline-actions';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result = { code: 'OK'; data: GuildStorylineChallenge } | { code: 'FAILED'; data: { message: string } };
export default async function App(params: { uid: number; bid?: string; repeatCommand?: string; request: BackendRequestContext }): Promise<Result> {
  try {
    return { code: 'OK', data: await challengeBackendGuildStoryline(params.bid, params.uid, params.request, params.repeatCommand) };
  } catch (error) {
    return { code: 'FAILED', data: { message: error instanceof Error ? error.message : '宗门主线挑战失败' } };
  }
}
