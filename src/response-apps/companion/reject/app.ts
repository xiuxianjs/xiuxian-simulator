import { BackendAPIError } from '@src/api';
import { actBackendCompanionProposalByName } from '@src/api/bot/interaction-overview';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result = { code: 'OK' | 'FAIL'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  proposerName: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    const result = await actBackendCompanionProposalByName(params.bid, params.uid, params.proposerName, 'reject', params.request, params.messageText);

    return { code: result.success ? 'OK' : 'FAIL', data: { message: result.message } };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof BackendAPIError ? error.message : '拒绝道侣申请失败，请稍后再试' } };
  }
}
