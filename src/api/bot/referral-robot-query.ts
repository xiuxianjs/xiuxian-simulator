import { parseBackendReferralOverview } from './referral-overview';
import { parseReferralInvitees } from './referral-invitees';

export function parseRobotReferralCode(value: unknown) {
  const overview = parseBackendReferralOverview(value);

  return { referralCode: overview.code, inviteCount: overview.inviteCount, inviteLimit: overview.inviteLimit, pendingRewards: overview.pendingRewards };
}

export function referralRuleDecoder(kind: 'count' | 'realm_level' | 'vip_level') {
  return (value: unknown) => {
    const overview = parseBackendReferralOverview(value);

    return { inviteCount: overview.inviteCount, ...overview.rulePanels[kind] };
  };
}

export function referralInviteesArguments(text: string) {
  const match = text.trim().match(/^(?:!|！|\/|#|＃)?我的邀请(?:\s+(\d+))?$/);
  const page = match ? Number(match[1] ?? 1) : 0;

  return { page: Number.isSafeInteger(page) && page >= 1 ? page : null };
}

export function referralInviteesDecoder(page: number | null) {
  return (value: unknown) => {
    if (page === null) {
      throw new Error('邀请列表分页响应不完整');
    }

    return parseReferralInvitees(value, page);
  };
}
