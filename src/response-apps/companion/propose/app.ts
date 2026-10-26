import { getBackendCompanionProposalPreflight, type CompanionProposalFriend, type CompanionProposalOathItem } from '@src/api/bot/companion-proposal-preflight';
import { executeBackendCompanionProposalCommand, proposeBackendCompanionOverview } from '@src/api/bot/interaction-overview';
import type { BackendRequestContext } from '@src/api/bot/context';

type FindTargetResult =
  | { code: 'NOT_FOUND'; data: { name: string } }
  | { code: 'FOUND'; data: { id: number; name: string }; preflight: Awaited<ReturnType<typeof getBackendCompanionProposalPreflight>> };
type FriendListResult = {
  code: 'OK';
  data: { friends: CompanionProposalFriend[]; currentPage: number; totalPages: number; totalCount: number };
};
type OathItemsResult = { code: 'NO_OATH_ITEMS' } | { code: 'OK'; data: { items: CompanionProposalOathItem[]; initiatorName: string } };
type ProposeResult = { code: 'OK'; data: { message: string; initiatorName: string } } | { code: 'FAIL'; data: { message: string } };

export async function findTargetUser(bid: string | undefined, uid: number, arg: string): Promise<FindTargetResult> {
  const result = await getBackendCompanionProposalPreflight(bid, uid, arg, 1);

  return result.target ? { code: 'FOUND', data: result.target, preflight: result } : { code: 'NOT_FOUND', data: { name: arg } };
}

export async function getEligibleFriends(params: { bid?: string; uid: number; page: number }): Promise<FriendListResult> {
  const result = await getBackendCompanionProposalPreflight(params.bid, params.uid, undefined, params.page);

  return { code: 'OK', data: { friends: result.friends, currentPage: result.currentPage, totalPages: result.totalPages, totalCount: result.totalCount } };
}

export async function getOathItemsForPropose(params: {
  bid?: string;
  uid: number;
  preflight?: Awaited<ReturnType<typeof getBackendCompanionProposalPreflight>>;
}): Promise<OathItemsResult> {
  const result = params.preflight ?? (await getBackendCompanionProposalPreflight(params.bid, params.uid, undefined, 1));

  return result.oathItems.length > 0 ? { code: 'OK', data: { items: result.oathItems, initiatorName: result.initiatorName } } : { code: 'NO_OATH_ITEMS' };
}

export async function performPropose(params: {
  bid?: string;
  uid: number;
  targetId: number;
  itemId: number;
  request?: BackendRequestContext;
}): Promise<ProposeResult> {
  try {
    const mutation = await proposeBackendCompanionOverview(params.bid, params.uid, params.targetId, params.itemId, params.request);

    if (!mutation.success) {
      return { code: 'FAIL', data: { message: mutation.message } };
    }

    return { code: 'OK', data: { message: mutation.message, initiatorName: mutation.initiatorName } };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '发起道侣申请失败，请稍后再试' } };
  }
}

export const executeProposalCommand = (params: {
  bid?: string;
  uid: number;
  target: string;
  targetBid?: string;
  oathIndex?: number;
  fallbackPage?: number;
  request?: BackendRequestContext;
}) => executeBackendCompanionProposalCommand(
    params.bid,
    params.uid,
    {
      target: params.target,
      targetBid: params.targetBid,
      oathIndex: params.oathIndex,
      fallbackPage: params.fallbackPage
    },
    params.request
  );
