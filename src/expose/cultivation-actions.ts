import { intentIdSchema, mutation, observation, taskAliasCommand, taskInputSchema, validateIntentId } from './mutation';
import { parseRobotRealmOverview } from '../api/bot/realm-overview';
import { boolean, fields, integer, list, number, object, text } from './schema';
import { parseMeditationBoostOptions, parseMeditationEnd, parseMeditationStart } from '../api/bot/meditation';
import { parseMeridianPulse } from '../api/bot/meridian';
import { parseRealmBreakthrough } from '../api/bot/realm-breakthrough';
import { query } from './query';
import { requestBackend } from '../api/bot/client';

const empty = object({});
const boost = object(
  {
    billingMode: { type: 'string', enum: ['prepaid', 'settlement'] },
    ...fields(integer, 'estimatedCharge estimatedRefund budgetMinutes reservedStone consumedStone refundedStone remainingMinutes'),
    enabled: boolean,
    multiplier: number,
    endsAt: text
  },
  ['billingMode', 'estimatedCharge', 'estimatedRefund', 'remainingMinutes', 'endsAt']
);
const benefits = {
  hasSeclusionPassBonus: boolean,
  maxDurationMinutes: integer,
  ...fields(number, 'qiBonusRate expBonusRate'),
  bonusLines: list(text),
  boost,
  success: boolean,
  ...fields(text, 'message elapsedText bonusLine'),
  elapsedMinutes: integer
};
const startFields = {
  ...benefits,
  button: text,
  buttonText: text,
  alreadyMeditating: boolean,
  ...fields(integer, 'qiSoFar expSoFar dailyRemaining maxDurationHours'),
  config: object(
    fields(
      number,
      'QI_PER_INTERVAL INTERVAL_MINUTES DAILY_QI_CAP EXP_PER_ENERGY EXP_RECOVERY_EFFICIENCY RECOVERED_MENTAL_PER_INTERVAL EXP_PER_INTERVAL MAX_DURATION_MINUTES'
    )
  ),
  passPreview: object({ maxDurationMinutes: integer, ...fields(number, 'qiBonusRate expBonusRate') })
};
const start = object(startFields, ['bonusLines', 'boost', 'button', 'buttonText']);
const end = object(
  {
    ...benefits,
    ...fields(integer, 'qiGained expGained creditedExperience recoveredMental totalQi dailyQiGained dailyQiCap minimumRewardMinutes'),
    rewardNotice: text
  },
  ['bonusLines', 'boost', 'creditedExperience']
);
const pulse = object({
  ...fields(
    integer,
    'index phase phaseIndex normalPulsesRemaining Progress RequiredProgress progressBefore basePulseRemaining extraPulseRemaining trueQiRemaining dailyPulseRemaining'
  ),
  ...fields(text, 'phaseName Name Category Description pulseBlockedReason'),
  ...fields(boolean, 'completed tailJumpEscalation phaseCompleted allCompleted canPulse jumped'),
  phases: list(object({ ...fields(integer, 'phase totalCount completedCount'), name: text, ...fields(boolean, 'completed unlocked') })),
  config: object(fields(integer, 'TOTAL_COUNT QI_PER_MERIDIAN PULSE_QI_COST PULSE_PROGRESS DAILY_PULSE_MAX DAILY_EXTRA_PULSE_MAX FOUNDATION_STAGE_LEVEL'))
});

export const cultivationActions = {
  execute_task_realm_view: mutation<{ taskInput: string; intentId?: string }>(
    '执行连锁任务中的“我的境界”步骤，返回服务端境界展示及任务推进回执；如需数值详情可再调用 get_realm。服务端先推进任务，再查询境界；新操作使用新 intentId，同次重试沿用原编号。',
    'realm.overview',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    object({ sections: list(object({ title: text, lines: list(text) })), ...fields(boolean, 'canUseSoulPath showBreakthrough showPromotion showTribulation') }),
    () => '/我的境界',
    parseRobotRealmOverview,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_meditation_progress: query(
    '查询闭关进度和服务端收益预估；不会启动或结算，预估不代表实际入账。reason 区分未开始和进行中。',
    object({ ...startFields, reason: { type: 'string', enum: ['not_started', 'active'] } }, ['bonusLines', 'boost', 'button', 'buttonText']),
    async ({ bid, uid, request }) => {
      const raw = await requestBackend(bid, 'get_players_id_meditation_progress', { path: { id: uid }, ...request });
      const reason = (raw as Record<string, unknown> | null)?.reason;

      if (reason !== 'not_started' && reason !== 'active') {
        throw new Error('闭关进度状态不完整');
      }

      return { ...parseMeditationStart(raw), reason };
    }
  ),
  get_meditation_boost_options: observation(
    '查询闭关自动加速设置、倍率、每结算周期灵石费用和余额。经过服务端准入，可能结算常规资源；不购买加速、不修改设置。',
    'meditation.boost-options',
    empty,
    object({ ...fields(boolean, 'autoEnabled enabled'), ...fields(integer, 'pricePerInterval intervalMinutes spiritStone maxHours'), multiplier: number }),
    () => '/闭关加速',
    data => ({ ...parseMeditationBoostOptions(data), intervalMinutes: (data as Record<string, unknown>).intervalMinutes })
  ),
  start_meditation: mutation<{ intentId?: string; taskInput?: string }>(
    '开始闭关；已有闭关则返回进度。遵循自动加速设置，出关可能消耗灵石，先查询设置。同消息新闭关使用新 intentId，同次重试沿用原编号。连锁任务可传入一致的 taskInput，检查 taskContinuation 和业务结果。',
    'meditation.start',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    start,
    () => '/闭关',
    parseMeditationStart,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  end_meditation: mutation<{ intentId?: string; taskInput?: string }>(
    '结束闭关并结算收益与加速费用；检查 result.success，未达到奖励时长可能无收益。同消息新出关使用新 intentId，同次重试沿用原编号。连锁任务可传入一致的 taskInput，检查 taskContinuation 和业务结果。',
    'meditation.end',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    end,
    input => taskAliasCommand(input.taskInput, ['出关', '打坐结束', '结束打坐']),
    parseMeditationEnd,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  pulse_meridian: mutation<{ intentId?: string; taskInput?: string }>(
    '执行一次冲脉，消耗服务端规定的真气和次数；返回实际进度和后续资格。相同消息内不同次操作使用不同 intentId，重试同一次使用原 intentId；未提供时相同消息按一次操作处理。连锁任务可传入一致的 taskInput，检查 taskContinuation 和业务结果。',
    'meridians.pulse',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    pulse,
    () => '/冲脉',
    parseMeridianPulse,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  breakthrough_realm: mutation<{ intentId?: string; taskInput?: string }>(
    '执行一次境界突破，服务端检查资格并结算。同消息内新突破使用新 intentId，同次重试沿用原编号；先检查每次境界和回执。',
    'realm.breakthrough',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object({
      newRealm: object({ name: text, ...fields(number, 'level spiritualPower speed magicAttack physicalAttack magicDefense physicalDefense experienceLimit') }),
      message: text,
      unlockedRecipes: list(text),
      isNewStage: boolean,
      newStageName: text,
      masterStageMessages: list(text)
    }),
    () => '/突破',
    parseRealmBreakthrough,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  )
};
