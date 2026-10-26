import { claimBackendBounty, getBackendPendingBountyRewards } from '@src/api/bot/bounty-actions';
import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';

type PendingReward = { bountyId: number; targetName: string; rewardAmount: number };
type ClaimResult =
  | { code: 'LIST'; data: { pending: PendingReward[] } }
  | { code: 'INVALID_ID' }
  | { code: 'INVALID_USER_STATUS' }
  | { code: 'NOTHING_TO_CLAIM' }
  | { code: 'INVALID_REWARD_AMOUNT' }
  | { code: 'FAIL' }
  | { code: 'OK'; data: { rewardAmount: number } };

export type { ClaimResult };

export default async function App(params: { bid?: string; uid: number; bountyId: number | null; request?: BackendRequestContext }): Promise<ClaimResult> {
  if (params.bountyId === null) {
    try {
      return { code: 'LIST', data: { pending: await getBackendPendingBountyRewards(params.bid, params.uid) } };
    } catch {
      return { code: 'FAIL' };
    }
  }
  if (!Number.isSafeInteger(params.bountyId) || params.bountyId <= 0) {
    return { code: 'INVALID_ID' };
  }

  try {
    return { code: 'OK', data: await claimBackendBounty(params.bid, params.bountyId, params.request) };
  } catch (error) {
    if (error instanceof BackendAPIError) {
      switch (error.code) {
        case 'BOUNTY_INVALID_USER_STATUS':
          return { code: 'INVALID_USER_STATUS' };
        case 'BOUNTY_NOTHING_TO_CLAIM':
          return { code: 'NOTHING_TO_CLAIM' };
        case 'BOUNTY_INVALID_REWARD_AMOUNT':
          return { code: 'INVALID_REWARD_AMOUNT' };
      }
    }

    return { code: 'FAIL' };
  }
}
