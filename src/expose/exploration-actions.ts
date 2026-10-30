import { ExposeError } from 'alemonjs';
import { parseSeclusionCommand } from '../api/bot/seclusion-command';
import { parseSeclusionEnd } from '../api/bot/seclusion-end';
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';

const drop = object({ name: text, quantity: integer });
const preview = object(
  {
    ...fields(integer, 'duration dungeonId experience spiritStone huanHunDan yangShenDan soulDew projectedCreditedExperience projectedGatheredCount'),
    ...fields(number, 'materialProgressPercent expectedHuanHunDan expectedYangShenDan'),
    ...fields(boolean, 'premium experienceCapWarning breakthroughReady'),
    rareDrops: list(drop)
  },
  [
    'projectedCreditedExperience',
    'projectedGatheredCount',
    'materialProgressPercent',
    'expectedHuanHunDan',
    'expectedYangShenDan',
    'experienceCapWarning',
    'breakthroughReady'
  ]
);
const dungeon = object({
  id: integer,
  name: text,
  startOptions: list(object({ duration: integer, spiritCost: integer, available: boolean, reason: text, preview }, ['reason']))
});
const status = object(
  {
    ...fields(boolean, 'inSeclusion startAvailable canEnd'),
    ...fields(text, 'startReason endReason'),
    recommendedDuration: integer,
    record: object(
      { ...fields(integer, 'id duration elapsedHours remainingHours settleableBlocks settleableHours dungeonId'), isCompleted: boolean, dungeonName: text },
      ['dungeonName']
    ),
    earlyExitPolicy: object({ ...fields(integer, 'settleBlockHours refundBeforeHours penaltyBeforeHours'), penaltyRate: number }),
    availableDungeons: list(dungeon)
  },
  ['startReason', 'endReason', 'recommendedDuration', 'record']
);
const viewResult = object({ code: text, canUseSoulPath: boolean, status, message: text }, ['status', 'message']);
const endResult = object(
  {
    ...fields(boolean, 'interrupted spiritRefunded penaltyApplied'),
    ...fields(integer, 'settledHours creditedExperience refundedSpirit gatheredMaterialCount'),
    materialProgressPercent: number,
    presenceText: text,
    view: object({
      ...fields(text, 'kind title introText penaltyText expBonusText'),
      ...fields(integer, 'pillCount rareDropTypeCount rareDropTotalCount'),
      ...fields(boolean, 'showHuanHunDan showYangShenDan showRareDrops')
    }),
    rewards: object({ ...fields(integer, 'experience spiritStone huanHunDan yangShenDan soulDew'), rareDrops: list(drop) })
  },
  ['creditedExperience', 'refundedSpirit', 'gatheredMaterialCount', 'materialProgressPercent', 'presenceText', 'rewards']
);

export const explorationActions = {
  get_exploration: observation(
    '查询探索状态、可选秘境、时长、精力和收益预览及提前返程规则；预览不保证实际收益。准入可能结算常规资源。',
    'seclusion.command',
    object({}),
    viewResult,
    () => '/探索秘境',
    data => {
      const result = parseSeclusionCommand(data, 'view');

      return result.result.code === 'OK'
        ? { code: 'OK', canUseSoulPath: result.access.canUseSoulPath, status: result.result.data }
        : { code: result.result.code, canUseSoulPath: result.access.canUseSoulPath, message: result.result.data.message };
    },
    () => ({ action: 'view' })
  ),
  execute_task_exploration: mutation<{ taskInput: string; intentId?: string }>(
    '查询探索状态、可选秘境、时长、精力和收益预览及提前返程规则；预览不保证实际收益。准入可能结算常规资源。',
    'seclusion.command',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    viewResult,
    () => '/探索秘境',
    data => {
      const result = parseSeclusionCommand(data, 'view');

      return result.result.code === 'OK'
        ? { code: 'OK', canUseSoulPath: result.access.canUseSoulPath, status: result.result.data }
        : { code: result.result.code, canUseSoulPath: result.access.canUseSoulPath, message: result.result.data.message };
    },
    () => ({ action: 'view' }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  start_exploration: mutation<{ dungeonName: string; duration: number; intentId?: string; taskInput?: string }>(
    '按名称开始探索秘境，时长和精力以服务端为准。同消息新探索使用新 intentId，同次重试沿用原编号；同名时由服务端解析目标。',
    'seclusion.command',
    object(
      {
        dungeonName: { type: 'string', minLength: 1 },
        duration: { type: 'integer', minimum: 1, maximum: 2147483647 },
        intentId: intentIdSchema,
        taskInput: taskInputSchema
      },
      ['intentId', 'taskInput']
    ),
    object(
      {
        code: text,
        canUseSoulPath: boolean,
        message: text,
        dungeon: object({ id: integer, name: text }),
        record: object({ duration: integer, spiritCost: integer, endTime: text }, ['endTime'])
      },
      ['message', 'dungeon', 'record']
    ),
    input => `/探索秘境 ${input.dungeonName} ${input.duration}`,
    (data, input) => {
      const result = parseSeclusionCommand(data, 'start');

      if (result.result.code !== 'OK') {
        return { code: result.result.code, canUseSoulPath: result.access.canUseSoulPath, message: result.result.data.message };
      }
      if (result.result.data.dungeon.name !== input.dungeonName || result.result.data.record.duration !== input.duration) {
        throw new Error('探索回执目标不匹配');
      }

      return { code: 'OK', canUseSoulPath: result.access.canUseSoulPath, ...result.result.data };
    },
    input => ({ action: 'start', dungeonName: input.dungeonName, duration: input.duration }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  start_exploration_by_id: mutation<{ dungeonId: number; duration: number; intentId?: string }>(
    '按 get_exploration 返回的 status.availableDungeons[].id 开始探索；服务端校验目标和时长。同消息新探索使用新 intentId，同次重试沿用原编号。',
    'seclusion.command',
    object(
      {
        dungeonId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
        duration: { type: 'integer', minimum: 1, maximum: 2147483647 },
        intentId: intentIdSchema
      },
      ['intentId']
    ),
    object(
      {
        code: text,
        canUseSoulPath: boolean,
        message: text,
        dungeon: object({ id: integer, name: text }),
        record: object({ duration: integer, spiritCost: integer, endTime: text }, ['endTime'])
      },
      ['message', 'dungeon', 'record']
    ),
    () => '/探索秘境',
    (data, input) => {
      const result = parseSeclusionCommand(data, 'start');

      if (result.result.code !== 'OK') {
        return { code: result.result.code, canUseSoulPath: result.access.canUseSoulPath, message: result.result.data.message };
      }
      if (result.result.data.dungeon.id !== input.dungeonId || result.result.data.record.duration !== input.duration) {
        throw new Error('探索回执编号或时长不匹配');
      }

      return { code: 'OK', canUseSoulPath: result.access.canUseSoulPath, ...result.result.data };
    },
    input => ({ action: 'start', dungeonId: input.dungeonId, duration: input.duration }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  ),
  end_exploration: mutation<{ intentId?: string; taskInput?: string }>(
    '结束当前探索并结算收益；提前返程可能退款或扣减收益，先查询规则。同消息新返程使用新 intentId，同次重试沿用原编号。',
    'seclusion.end',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    endResult,
    input => {
      if (input.taskInput === undefined) {
        return '/返程';
      }
      const command = input.taskInput
        .trim()
        .replace(/^[!！/#＃]\s*/, '')
        .trim();

      if (!['返程', '结束探索'].includes(command)) {
        throw new ExposeError('INVALID_INPUT', '返程任务指令不匹配');
      }

      return `/${command}`;
    },
    data => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('返程回执不完整');
      }

      return parseSeclusionEnd((data as Record<string, unknown>).result);
    },
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  )
};
