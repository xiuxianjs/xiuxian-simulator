import { parseBackendFirstRechargeInfo } from '../api/bot/first-recharge-queries';
import { parseRobotFirstRechargeClaim } from '../api/bot/first-recharge-claim';
import { parseBackendNewcomerRechargeInfo } from '../api/bot/newcomer-recharge-queries';
import { parseBackendNewcomerRechargeClaim } from '../api/bot/newcomer-recharge-claim';
import { parseBackendWeeklyRebate } from '../api/bot/weekly-rebate-queries';
import { parseRobotWeeklyRebateClaim } from '../api/bot/weekly-rebate-claim';
import { parseBackendRechargeRights } from '../api/bot/recharge-rights-queries';
import { parseBackendVipPrivileges } from '../api/bot/vip-privileges-queries';
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';

const reward = object({ id: number, name: text, quantity: number }, ['name']);
const pack = object({ ...fields(number, 'id priceAmount grantSpiritStone grantSpiritCrystal grantSpiritMilk'), items: list(reward), skills: list(reward) });
const daily = object(
  {
    ...fields(number, 'prepaidCount total claimableCount claimedCount upcomingCount'),
    reviewRequired: boolean,
    calendarState: list(
      object({ day: number, rewardDate: text, state: { type: 'string', enum: ['claimed', 'claimable', 'upcoming'] }, prepaid: boolean }, ['prepaid'])
    )
  },
  ['prepaidCount', 'reviewRequired']
);
const pass = object({ active: boolean, expireTime: text, ...fields(number, 'remainingDays totalDays maxDays'), package: pack }, ['expireTime', 'package']);
const card = object({ active: boolean, expireTime: text, ...fields(number, 'remainingDays totalDays maxDays remainingQuota'), daily, package: pack }, [
  'expireTime',
  'package'
]);
const privilege = object({ minLevel: number, text, unlocked: boolean, needText: text }, ['minLevel', 'needText']);

const issued = list(object({ type: text, name: text, amount: integer }));
const day = (maximum: number) => ({ type: 'integer' as const, minimum: 1, maximum });
const commandArgs = (command: string) => ({ input: command });

export const membershipActions = {
  get_first_recharge_rewards: observation(
    '查询首充礼包档位、状态及服务端奖励内容；金额单位为元。',
    'recharge.first-info',
    object({}),
    object({
      tiers: list(
        object({
          tierAmountYuan: number,
          status: { type: 'string', enum: ['locked', 'claimable', 'claimed'] },
          rewards: list(object({ type: text, currencyCode: text, itemId: number, quantity: number })),
          rewardText: text
        })
      )
    }),
    () => '/礼包奖励',
    parseBackendFirstRechargeInfo
  ),
  claim_first_recharge_reward: mutation<{ tierYuan: number; intentId?: string; taskInput?: string }>(
    '领取指定首充礼包档位，tierYuan 使用查询结果中的整数元档位；是否符合资格以服务端结果为准。',
    'recharge.first-claim',
    object({ tierYuan: day(Math.floor(Number.MAX_SAFE_INTEGER / 100)), intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object({ tierYuan: number, issued }),
    input => `/领取礼包奖励 ${input.tierYuan}`,
    parseRobotFirstRechargeClaim,
    input => commandArgs(`/领取礼包奖励 ${input.tierYuan}`),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_newcomer_recharge_rebate: observation(
    '查询新人返利周期、充值门槛和各日领取状态；金额字段单位为分。',
    'recharge.newcomer-info',
    object({}),
    object({
      ...fields(integer, 'contentDays daysSinceRegistration currentDay todayRechargedAmount thresholdAmount maxClaimableDay'),
      ...fields(boolean, 'isInPeriod todayRewardClaimed'),
      claimedDays: list(integer),
      rewards: list(
        object({
          ...fields(integer, 'day spiritStone spiritCrystal spiritMilk'),
          ...fields(boolean, 'claimed canClaim'),
          ...fields(text, 'rewardText statusTag'),
          items: list(object({ itemId: integer, quantity: integer }))
        })
      )
    }),
    () => '/新人返利',
    parseBackendNewcomerRechargeInfo
  ),
  claim_newcomer_recharge_rebate: mutation<{ dayIndex: number; intentId?: string; taskInput?: string }>(
    '领取新人返利指定天数奖励，服务端检查周期、充值门槛和领取状态。',
    'recharge.newcomer-claim',
    object({ dayIndex: day(14), intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object({ dayIndex: integer, reward: object({ ...fields(integer, 'spiritStone spiritCrystal spiritMilk'), itemIds: text }), rewardText: text }),
    input => `/新人返利领取 ${input.dayIndex}`,
    parseBackendNewcomerRechargeClaim,
    input => commandArgs(`/新人返利领取 ${input.dayIndex}`),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_weekly_recharge_rebate: observation(
    '查询本周返利资格、充值门槛和各日奖励；amount 字段单位为分，Yuan 字段单位为元。',
    'recharge.weekly-info',
    object({}),
    object({
      ...fields(boolean, 'eligible canClaimToday canClaimBonus'),
      ...fields(number, 'minAccountDays dailyThresholdAmount daysSinceRegistration todayDayOfWeek todayRechargedAmount todayRechargedYuan thresholdYuan'),
      ...fields(text, 'todayLabel weekStart todayRechargeText'),
      claimedDays: list(number),
      rewards: list(
        object({
          ...fields(number, 'day spiritStone spiritCrystal spiritMilk'),
          ...fields(text, 'label statusTag rewardText'),
          canClaim: boolean,
          items: list(object({ itemId: number, quantity: number, name: text }, ['name']))
        })
      )
    }),
    () => '/周周返利',
    parseBackendWeeklyRebate
  ),
  claim_weekly_recharge_rebate: mutation<{ dayIndex: number; intentId?: string; taskInput?: string }>(
    '领取周返利指定天数奖励；第 8 项为满勤奖励，服务端判断领取资格。',
    'recharge.weekly-rebate-claim',
    object({ dayIndex: day(8), intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object({ dayIndex: integer, issued }),
    input => `/周周返利领取 ${input.dayIndex}`,
    parseRobotWeeklyRebateClaim,
    input => commandArgs(`/周周返利领取 ${input.dayIndex}`),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_membership_rights: observation(
    '查询本人权益、月卡到期与每日奖励状态、探索通行证和充值进度；金额单位为分。reviewRequired 表示奖励状态需要核对，不领取或购买。',
    'membership.rights',
    object({}),
    object(
      {
        name: text,
        ...fields(number, 'vipLevel totalRechargeAmount nextVipLevel nextVipThreshold'),
        firstRechargeTime: text,
        monthCard: card,
        seclusionPass: pass,
        ...fields(boolean, 'canUseMeridian canUseSoulPath'),
        progressText: text,
        monthCardInstantRewards: list(text),
        seclusionPriceText: text,
        seclusionRewards: list(text)
      },
      ['nextVipLevel', 'nextVipThreshold', 'firstRechargeTime']
    ),
    () => '/我的权益',
    data => {
      const result = parseBackendRechargeRights(data);
      const source = data as { monthCard: { daily: { prepaidCount?: unknown; reviewRequired?: unknown; calendarState: Array<{ prepaid?: unknown }> } } };
      const raw = source.monthCard.daily;
      const { prepaidCount, reviewRequired, calendarState, ...rest } = result.monthCard.daily;

      return {
        ...result,
        monthCard: {
          ...result.monthCard,
          daily: {
            ...rest,
            ...(typeof raw.prepaidCount === 'number' ? { prepaidCount } : {}),
            ...(typeof raw.reviewRequired === 'boolean' ? { reviewRequired } : {}),
            calendarState: calendarState.map((row, i) => {
              const { prepaid, ...other } = row;

              return { ...other, ...(typeof raw.calendarState[i]?.prepaid === 'boolean' ? { prepaid } : {}) };
            })
          }
        }
      };
    }
  ),
  execute_task_membership_rights: mutation<{ taskInput: string; intentId?: string }>(
    '查询本人权益、月卡到期与每日奖励状态、探索通行证和充值进度；金额单位为分。reviewRequired 表示奖励状态需要核对，不领取或购买。',
    'membership.rights',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    object(
      {
        name: text,
        ...fields(number, 'vipLevel totalRechargeAmount nextVipLevel nextVipThreshold'),
        firstRechargeTime: text,
        monthCard: card,
        seclusionPass: pass,
        ...fields(boolean, 'canUseMeridian canUseSoulPath'),
        progressText: text,
        monthCardInstantRewards: list(text),
        seclusionPriceText: text,
        seclusionRewards: list(text)
      },
      ['nextVipLevel', 'nextVipThreshold', 'firstRechargeTime']
    ),
    () => '/我的权益',
    data => {
      const result = parseBackendRechargeRights(data);
      const source = data as { monthCard: { daily: { prepaidCount?: unknown; reviewRequired?: unknown; calendarState: Array<{ prepaid?: unknown }> } } };
      const raw = source.monthCard.daily;
      const { prepaidCount, reviewRequired, calendarState, ...rest } = result.monthCard.daily;

      return {
        ...result,
        monthCard: {
          ...result.monthCard,
          daily: {
            ...rest,
            ...(typeof raw.prepaidCount === 'number' ? { prepaidCount } : {}),
            ...(typeof raw.reviewRequired === 'boolean' ? { reviewRequired } : {}),
            calendarState: calendarState.map((row, i) => {
              const { prepaid, ...other } = row;

              return { ...other, ...(typeof raw.calendarState[i]?.prepaid === 'boolean' ? { prepaid } : {}) };
            })
          }
        }
      };
    },
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_membership_privileges: observation(
    '查询本人 VIP 和月卡特权、等级资格、签到加倍日期及每日丹药限制；金额单位为分，特权开放状态以服务端为准。',
    'membership.privileges',
    object({}),
    object({
      found: boolean,
      name: text,
      ...fields(number, 'vipLevel totalRechargeAmount pillDailyLimit'),
      ...fields(boolean, 'hasMonthCard canUseMeridian canUseSoulPath'),
      levelEligibility: list(object({ minLevel: number, unlocked: boolean, needAmount: number })),
      checkinDoubleDays: list(object({ key: text, days: list(number) })),
      vipPrivileges: list(privilege),
      monthCardPrivileges: list(privilege)
    }),
    () => '/我的特权',
    data => {
      const result = parseBackendVipPrivileges(data);

      return { ...result, checkinDoubleDays: Object.entries(result.checkinDoubleDays).map(([key, days]) => ({ key, days })) };
    }
  )
};
