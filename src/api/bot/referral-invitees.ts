import { requestBackend } from './client';

export interface ReferralNextReward {
  goal: string;
  rewards: string[];
}
export interface ReferralInvitee {
  userId: number;
  name: string;
  realmName: string;
  pendingRewards: number;
  claimedRewards: number;
  nextRealmReward: ReferralNextReward | null;
  nextVipReward: ReferralNextReward | null;
}
export interface ReferralInviteePage {
  items: ReferralInvitee[];
  total: number;
  page: number;
  pageSize: number;
}
const integer = (value: unknown, minimum = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;

function nextReward(value: unknown): value is ReferralNextReward | null {
  if (value === null) {
    return true;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;

  return typeof row.goal === 'string' && Array.isArray(row.rewards) && row.rewards.every(reward => typeof reward === 'string');
}
export async function getReferralInvitees(bid: string | undefined, uid: number, page: number): Promise<ReferralInviteePage> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const value = await requestBackend(bid, 'get_players_id_referral_invitees', { path: { id: uid }, query: { page, pageSize: 5 } });

  return parseReferralInvitees(value, page);
}

export function parseReferralInvitees(value: unknown, page: number): ReferralInviteePage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('邀请列表响应不完整');
  }
  const data = value as Record<string, unknown>;

  if (
    !integer(data.total) ||
    !integer(data.page, 1) ||
    data.page !== page ||
    data.pageSize !== 5 ||
    !Array.isArray(data.items) ||
    data.items.length > 5 ||
    data.items.length > data.total
  ) {
    throw new Error('邀请列表分页响应不完整');
  }
  for (const item of data.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('邀请道友响应不完整');
    }
    const row = item as Record<string, unknown>;

    if (
      !integer(row.userId, 1) ||
      typeof row.name !== 'string' ||
      typeof row.realmName !== 'string' ||
      !integer(row.pendingRewards) ||
      !integer(row.claimedRewards) ||
      !nextReward(row.nextRealmReward) ||
      !nextReward(row.nextVipReward)
    ) {
      throw new Error('邀请道友响应不完整');
    }
  }

  return data as unknown as ReferralInviteePage;
}
