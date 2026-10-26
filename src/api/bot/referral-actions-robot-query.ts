import { parseBackendReferralBind, parseBackendReferralClaim } from './referral-actions';
import { displayCurrencyText } from '@src/constants/currency';

export function referralBindArguments(text: string) {
  const match = text.trim().match(/绑定邀请码\s+(.+)/);

  return { code: match ? match[1].trim() : null };
}

function result(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('邀请码操作响应不完整');
  }

  return value as Record<string, unknown>;
}

export function parseRobotReferralBind(value: unknown) {
  const row = result(value);

  if (row.outcome === 'usage') {
    return { code: 'NO_CODE' as const };
  }
  if (row.outcome !== 'result' || typeof row.message !== 'string') {
    throw new Error('绑定邀请码响应不完整');
  }
  parseBackendReferralBind(row.data);

  return { code: 'SUCCESS' as const, displayMsg: row.message, showBar: true };
}

export function parseRobotReferralClaim(value: unknown) {
  const row = result(value);

  if (row.outcome !== 'result' || typeof row.message !== 'string') {
    throw new Error('领取邀请码奖励响应不完整');
  }
  const data = parseBackendReferralClaim(row.data);

  return { displayMsg: row.message, rewards: data.issued.map(item => `${displayCurrencyText(item.name)} ×${item.amount}`) };
}
