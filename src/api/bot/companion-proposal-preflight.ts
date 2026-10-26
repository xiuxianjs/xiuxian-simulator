import { requestBackend } from './client';

export interface CompanionProposalOathItem {
  itemId: number;
  name: string;
  quantity: number;
  oathType: string;
  desc: string;
}

export interface CompanionProposalFriend {
  friendId: number;
  friendName: string;
  friendRealm: string;
  intimacy: number;
  spiritBondLevel: string;
}

export interface CompanionProposalPreflight {
  initiatorName: string;
  target: { id: number; name: string } | null;
  oathItems: CompanionProposalOathItem[];
  friends: CompanionProposalFriend[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('道侣申请预检数据不完整');
  }

  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseTarget(value: unknown): CompanionProposalPreflight['target'] {
  if (value === null) {
    return null;
  }

  const target = record(value);

  if (!positiveInteger(target.id) || typeof target.name !== 'string') {
    throw new Error('道侣申请预检数据不完整');
  }

  return { id: target.id, name: target.name };
}

function parseOathItem(value: unknown): CompanionProposalOathItem {
  const item = record(value);

  if (
    !positiveInteger(item.itemId) ||
    typeof item.name !== 'string' ||
    !nonNegativeInteger(item.quantity) ||
    typeof item.oathType !== 'string' ||
    typeof item.desc !== 'string'
  ) {
    throw new Error('道侣申请预检数据不完整');
  }

  return { itemId: item.itemId, name: item.name, quantity: item.quantity, oathType: item.oathType, desc: item.desc };
}

function parseFriend(value: unknown): CompanionProposalFriend {
  const friend = record(value);

  if (
    !positiveInteger(friend.friendId) ||
    typeof friend.friendName !== 'string' ||
    typeof friend.friendRealm !== 'string' ||
    typeof friend.spiritBondLevel !== 'string' ||
    typeof friend.intimacy !== 'number' ||
    !Number.isFinite(friend.intimacy)
  ) {
    throw new Error('道侣申请预检数据不完整');
  }

  return {
    friendId: friend.friendId,
    friendName: friend.friendName,
    friendRealm: friend.friendRealm,
    intimacy: friend.intimacy,
    spiritBondLevel: friend.spiritBondLevel
  };
}

export async function getBackendCompanionProposalPreflight(
  bid: string | undefined,
  uid: number,
  target: string | undefined,
  page: number
): Promise<CompanionProposalPreflight> {
  if (!bid) {
    throw new Error('道侣申请缺少平台身份');
  }

  const data = record(
    await requestBackend(bid, 'get_players_id_companion_proposal_preflight', {
      path: { id: uid },
      query: { target, page, pageSize: 10 }
    })
  );

  return parseCompanionProposalPreflight(data);
}

export function parseCompanionProposalPreflight(value: unknown): CompanionProposalPreflight {
  const data = record(value);

  if (
    typeof data.initiatorName !== 'string' ||
    !Array.isArray(data.oathItems) ||
    !Array.isArray(data.friends) ||
    !nonNegativeInteger(data.currentPage) ||
    !nonNegativeInteger(data.totalPages) ||
    !nonNegativeInteger(data.totalCount)
  ) {
    throw new Error('道侣申请预检数据不完整');
  }

  return {
    initiatorName: data.initiatorName,
    target: parseTarget(data.target),
    oathItems: data.oathItems.map(parseOathItem),
    friends: data.friends.map(parseFriend),
    currentPage: data.currentPage,
    totalPages: data.totalPages,
    totalCount: data.totalCount
  };
}
