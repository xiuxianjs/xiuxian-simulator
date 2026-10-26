import { publishBackendBounty } from '@src/api/bot/bounty-actions';
import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';

type PublishResult =
  | { code: 'INVALID_PARAMS' }
  | { code: 'FAIL'; data: { message: string } }
  | {
      code: 'OK';
      data: {
        bountyId: number;
        totalCost: number;
        fee: number;
        rewardPool: number;
        rewardPerPerson: number;
        maxCompletions: number;
        targetName: string;
        validHours: number;
      };
    };

export type { PublishResult };

export default async function App(params: {
  bid?: string;
  uid: number;
  targetUid: number;
  amount: number;
  maxCompletions?: number;
  request?: BackendRequestContext;
}): Promise<PublishResult> {
  const { bid, uid, targetUid, amount, maxCompletions, request } = params;

  if (!Number.isSafeInteger(targetUid) || !Number.isSafeInteger(amount) || (maxCompletions !== undefined && !Number.isSafeInteger(maxCompletions))) {
    return { code: 'INVALID_PARAMS' };
  }

  try {
    return { code: 'OK', data: await publishBackendBounty(bid, uid, targetUid, amount, maxCompletions, request) };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof BackendAPIError ? error.message : '悬赏发布失败，请稍后再试' } };
  }
}
