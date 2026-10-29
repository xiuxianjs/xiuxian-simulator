import { parseBackendReferralBind, parseBackendReferralClaim } from '../api/bot/referral-actions';
import { parseReferralInvitees } from '../api/bot/referral-invitees';
import { parseBackendReferralOverview } from '../api/bot/referral-overview';
import { mutation, observation } from './mutation';
import { integer, list, object, page, text } from './schema';

const reward = object({ name: text, amount: integer });
const panel = object({ pendingCount: integer, groups: list(object({ threshold: text, icon: text, tag: text, rewards: list(text) })) });
const nextReward = object({ goal: text, rewards: list(text) });
const result = (data: unknown) => {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !('outcome' in data) ||
    data.outcome !== 'result' ||
    !('message' in data) ||
    typeof data.message !== 'string' ||
    !('data' in data)
  ) {
    throw new Error('邀请操作响应不完整');
  }

  return data as { message: string; data: unknown };
};

export const referralActions = {
  get_referral_overview: observation(
    '查询本人邀请码、邀请人数、待领数量及奖励规则；服务端会同步已达成的奖励资格，但不领取奖励。',
    'referral.code',
    object({}),
    object(
      {
        code: text,
        inviteCount: integer,
        inviteLimit: integer,
        pendingRewards: integer,
        rulePanels: object({ count: panel, vip_level: panel, realm_level: panel })
      },
      ['inviteLimit']
    ),
    () => '/邀请码',
    parseBackendReferralOverview
  ),
  get_referral_invitees: observation<{ page: number }>(
    '分页查询本人邀请的玩家、奖励状态和下一成长目标。',
    'referral.invitees',
    object({ page }),
    object({
      total: integer,
      page: integer,
      pageSize: integer,
      items: list(
        object(
          {
            userId: integer,
            name: text,
            realmName: text,
            pendingRewards: integer,
            claimedRewards: integer,
            nextRealmReward: nextReward,
            nextVipReward: nextReward
          },
          ['nextRealmReward', 'nextVipReward']
        )
      )
    }),
    input => `/我的邀请 ${input.page}`,
    (data, input) => parseReferralInvitees(data, input.page)
  ),
  bind_referral_code: mutation<{ code: string }>(
    '绑定玩家明确提供的邀请码，服务端校验绑定资格并发放实际奖励；绑定结果不能由调用方自行撤销。',
    'referral.bind',
    object({ code: { type: 'string', minLength: 1, maxLength: 100 } }),
    object({ message: text, issued: list(reward) }),
    input => `/绑定邀请码 ${input.code}`,
    data => {
      const row = result(data);

      return { message: row.message, issued: parseBackendReferralBind(row.data) };
    }
  ),
  claim_referral_rewards: mutation(
    '领取本人已达成的邀请奖励；返回服务端实际领取条数和发放物品。',
    'referral.claim',
    object({}),
    object({ message: text, claimed: integer, issued: list(reward) }),
    () => '/领取邀请奖励',
    data => {
      const row = result(data);

      return { message: row.message, ...parseBackendReferralClaim(row.data) };
    }
  )
};
