import { BackendAPIError } from '@src/api';
import { actBackendCompanionProposalByName } from '@src/api/bot/interaction-overview';
import { getBackendCompanionProposals } from '@src/api/bot/companion-proposal-queries';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result = { code: 'LIST'; data: { received: Array<{ fromName: string; intimacy: number }> } } | { code: 'OK' | 'FAIL'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  proposerName?: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  if (!params.proposerName) {
    const proposals = await getBackendCompanionProposals(params.bid, params.uid);

    return { code: 'LIST', data: { received: proposals.map(p => ({ fromName: p.fromName, intimacy: p.intimacy })) } };
  }
  try {
    // The command remains name-based for compatibility; the only authority for
    // resolving it is the service-owned pending proposal inbox.
    const result = await actBackendCompanionProposalByName(params.bid, params.uid, params.proposerName, 'accept', params.request, params.messageText);

    return { code: result.success ? 'OK' : 'FAIL', data: { message: result.message } };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof BackendAPIError ? error.message : '同意道侣申请失败，请稍后再试' } };
  }
}
