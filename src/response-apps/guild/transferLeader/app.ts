import { transferBackendGuildLeadership, type GuildLeadershipCandidate } from '@src/api/bot/guild-member-lifecycle';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult =
  | { code: 'CANDIDATES'; data: { topMembers: GuildLeadershipCandidate[] } }
  | { code: 'CONFIRMATION_REQUIRED'; data: { message: string; seconds: number } }
  | { code: 'TRANSFER_DONE'; data: { success: boolean; message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; index: number; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = await transferBackendGuildLeadership(params.bid, params.uid, params.index, params.request);

    if (result.outcome === 'candidates') {
      return { code: 'CANDIDATES', data: { topMembers: result.candidates } };
    }
    if (result.outcome === 'confirmation_required') {
      return { code: 'CONFIRMATION_REQUIRED', data: { message: result.message, seconds: result.confirmationExpiresInSeconds ?? 60 } };
    }

    return { code: 'TRANSFER_DONE', data: { success: result.outcome === 'transferred', message: result.message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '转让失败' } };
  }
}
