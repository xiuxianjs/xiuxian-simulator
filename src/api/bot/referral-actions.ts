import { repeatPresentationHeaders } from './repeat-presentation';
import { BackendAPIError, requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parsePositiveIssuedRewards } from '../schemas/issued-reward';

type RawRecord = Record<string, unknown>;

export type BackendReferralIssuedReward = {
  name: string;
  amount: number;
};

function record(value: unknown, message: string): RawRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as RawRecord;
}

function integer(value: unknown, message: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(message);
  }

  return value;
}

function issued(value: unknown, message: string): BackendReferralIssuedReward[] {
  return parsePositiveIssuedRewards(value, message).map(({ name, amount }) => ({ name, amount }));
}

export function referralBindFailureMessage(error: unknown): string | undefined {
  if (!(error instanceof BackendAPIError)) {
    return undefined;
  }

  if (error.message.includes('邀请码格式错误')) {
    return '邀请码格式错误，请输入 tt-uid';
  }
  if (error.message.includes('绑定邀请码已过期') || error.message.includes('仅可在注册30天内绑定')) {
    return '仅可在注册30天内绑定邀请码';
  }
  if (error.message.includes('已经绑定过')) {
    return '你已经绑定过邀请码了';
  }
  if (error.message.includes('不能绑定自己的')) {
    return '不能绑定自己的邀请码';
  }
  if (error.message.includes('邀请人不存在') || error.message.includes('邀请码对应的玩家不存在')) {
    return '邀请码对应的玩家不存在';
  }
  if (error.message.includes('邀请人数已达上限') || error.message.includes('邀请名额已满')) {
    return '该邀请人的邀请名额已满，无法绑定';
  }
  if (error.message.includes('玩家不存在')) {
    return '玩家不存在';
  }

  return undefined;
}

export function referralClaimFailureMessage(error: unknown): string | undefined {
  if (!(error instanceof BackendAPIError)) {
    return undefined;
  }

  if (error.message.includes('暂无可领取的邀请码奖励')) {
    return '暂无可领取的奖励';
  }
  if (error.message.includes('奖励配置已失效')) {
    return '奖励配置已失效，无法领取';
  }
  if (error.message.includes('旧奖励缺少可恢复快照') || error.message.includes('已达成奖励快照异常')) {
    return error.message;
  }

  return undefined;
}

export async function bindBackendReferralCode(
  bid: string | undefined,
  uid: number,
  code: string,
  request?: BackendRequestContext
): Promise<BackendReferralIssuedReward[]> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  const result = record(
    await requestBackend(bid, 'post_players_id_referral_bind', {
      path: { id: uid },
      body: { code },
      headers: repeatPresentationHeaders('绑定邀请码'),
      ...writeContext(request)
    }),
    '绑定邀请码响应不完整'
  );

  return parseBackendReferralBind(result);
}

export function parseBackendReferralBind(value: unknown): BackendReferralIssuedReward[] {
  const result = record(value, '绑定邀请码响应不完整');

  return issued(result.issued, '绑定邀请码奖励响应不完整');
}

export async function claimBackendReferralRewards(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext
): Promise<{ claimed: number; issued: BackendReferralIssuedReward[] }> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  const result = record(
    await requestBackend(bid, 'post_players_id_referral_claim', {
      path: { id: uid },
      headers: repeatPresentationHeaders('领取邀请奖励'),
      ...writeContext(request)
    }),
    '领取邀请码奖励响应不完整'
  );

  return parseBackendReferralClaim(result);
}

export function parseBackendReferralClaim(value: unknown): { claimed: number; issued: BackendReferralIssuedReward[] } {
  const result = record(value, '领取邀请码奖励响应不完整');

  return {
    claimed: integer(result.claimed, '领取邀请码奖励响应不完整', 1),
    issued: issued(result.issued, '领取邀请码奖励响应不完整')
  };
}
