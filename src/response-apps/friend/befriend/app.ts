import { requestFriendWorkflow } from '@src/api/bot/social-workflows';
import type { TargetSelector } from '@src/api/schemas/social-workflows';
import { isFriendRequestDomainFailure } from '@src/api/bot/friend-request-actions';
import type { BackendRequestContext } from '@src/api/bot/context';

export function parseBefriendCommand(messageText: string): number | null {
  const match = (messageText?.trim() ?? '').match(/^[!！/#＃]?结交\s+(\d+)$/);

  if (!match) {
    return null;
  }
  const id = parseInt(match[1], 10);

  return isNaN(id) || id <= 0 ? -1 : id;
}

type Result =
  | { code: 'LOCKED'; data: { realmName: string } }
  | { code: 'INVALID' }
  | { code: 'OK'; data: { targetName: string; requestId: number } }
  | { code: 'FAIL'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  selector: TargetSelector;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    const data = await requestFriendWorkflow(params.bid, params.uid, { action: 'request', ...params.selector }, params.request, params.repeatCommand);

    if (data.outcome === 'locked') {
      return { code: 'LOCKED', data: { realmName: data.realmName ?? '未知' } };
    }
    if (data.outcome !== 'result' || !data.request) {
      return { code: 'INVALID' };
    }
    const result = data.request;

    if (!result.success) {
      return { code: 'FAIL', data: { message: result.message } };
    }

    return { code: 'OK', data: { targetName: result.targetName, requestId: result.requestId } };
  } catch (error) {
    if (isFriendRequestDomainFailure(error)) {
      return { code: 'FAIL', data: { message: error.message } };
    }
    throw error;
  }
}
