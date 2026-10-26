/** 接赏：机器人只解析参数、调用 Go 并交给展示层反馈。 */
import { acceptBackendBounty, type BackendBountyAccept } from '@src/api/bot/bounty-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import { BackendAPIError } from '@src/api/bot/client';

type AcceptResult = { code: 'INVALID_ID' } | { code: 'FAIL'; data: { message: string } } | { code: 'OK'; data: BackendBountyAccept };
export type { AcceptResult };

export default async function App(params: { bid?: string; bountyId: number; request: BackendRequestContext }): Promise<AcceptResult> {
  if (!Number.isSafeInteger(params.bountyId) || params.bountyId <= 0) {
    return { code: 'INVALID_ID' };
  }
  try {
    return { code: 'OK', data: await acceptBackendBounty(params.bid, params.bountyId, params.request) };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof BackendAPIError ? error.message : '接赏失败，请稍后再试' } };
  }
}
