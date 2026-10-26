import { acceptBackendFriendRequest, isFriendRequestDomainFailure } from '@src/api/bot/friend-request-actions';
import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_COMMON } from '@src/constants/messages';

export function parseAcceptCommand(messageText: string): number | null {
  const match = (messageText?.trim() ?? '').match(/^[!！/#＃]?同意结交\s+(\d+)$/);

  if (!match) {
    return null;
  }
  const id = parseInt(match[1], 10);

  return isNaN(id) ? null : id;
}

type Result = { code: 'OK'; data: { fromUserName: string } } | { code: 'FAIL'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  requestId: number;
  request?: BackendRequestContext;
  repeatCommand?: string;
}): Promise<Result> {
  try {
    const result = await acceptBackendFriendRequest(params.bid, params.uid, params.requestId, params.request, params.repeatCommand);

    if (!result.success) {
      return { code: 'FAIL', data: { message: result.message } };
    }

    return { code: 'OK', data: { fromUserName: result.fromUserName } };
  } catch (error) {
    if (isFriendRequestDomainFailure(error)) {
      return { code: 'FAIL', data: { message: error.message } };
    }
    if (error instanceof BackendAPIError) {
      return { code: 'FAIL', data: { message: MSG_COMMON.OPERATION_FAILED } };
    }
    throw error;
  }
}
