import { validateBackendTaskConfigPage } from '../api/bot/task-config';
import { parseBackendTaskRuntimeAction } from '../api/bot/task-runtime-action';
import { parseBackendTaskRuntimeCancel } from '../api/bot/task-runtime-cancel';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, object, text } from './schema';

const empty = object({});
const page = object({
  config: object({ slots: list(object({ alias: text, steps: list(text) })) }),
  limits: object({ ...fields(integer, 'slotCount maxSteps'), isMonthCard: boolean })
});
const runtime = object(
  {
    outcome: { type: 'string', enum: ['started', 'next', 'completed', 'expected', 'current', 'not_running', 'invalid_runtime', 'empty_slot', 'invalid_slot'] },
    command: text,
    executed: text,
    message: text,
    slot: integer,
    step: integer,
    page
  },
  ['command', 'executed', 'message', 'slot', 'step', 'page']
);

export const taskActions = {
  set_task_chain_step: mutation<{ slot: number; step: number; content: string }>(
    '设置连锁任务槽位中的指定步骤，仅保存指令文本，不执行指令；服务端校验槽位、顺序和内容。',
    'tasks.settings',
    object({
      slot: { type: 'integer', minimum: 1, maximum: 10 },
      step: { type: 'integer', minimum: 1, maximum: 10 },
      content: { type: 'string', minLength: 1, maxLength: 50 }
    }),
    object({ mode: { type: 'string', enum: ['slot'] }, slot: integer, alias: text, steps: list(text), maxSteps: integer }),
    input => `/任务设置 ${input.slot} ${input.step} ${input.content}`,
    (data, input) => {
      const row = data as Record<string, unknown> | null;

      if (
        row?.mode !== 'slot' ||
        row.slot !== input.slot ||
        typeof row.alias !== 'string' ||
        !Number.isSafeInteger(row.maxSteps) ||
        !Array.isArray(row.steps) ||
        row.steps.some(step => typeof step !== 'string')
      ) {
        throw new Error('任务步骤设置回执不完整');
      }

      return row;
    },
    input => ({ slot: String(input.slot), step: String(input.step), content: input.content })
  ),
  set_task_chain_alias: mutation<{ slot: number; alias: string }>(
    '设置连锁任务槽位别名，服务端负责别名和槽位限制；返回更新后的配置。',
    'tasks.alias',
    object({ slot: { type: 'integer', minimum: 1, maximum: 10 }, alias: { type: 'string', minLength: 1, maxLength: 12 } }),
    object({ mode: { type: 'string', enum: ['overview'] }, page }),
    input => `/任务别名 ${input.slot} ${input.alias}`,
    data => {
      const row = data as Record<string, unknown> | null;

      if (row?.mode !== 'overview') {
        throw new Error('任务别名设置回执不完整');
      }

      return { mode: row.mode, page: validateBackendTaskConfigPage(row.page) };
    },
    input => ({ slot: String(input.slot), alias: input.alias })
  ),
  clear_task_chain_slot: mutation<{ slot: number }>(
    '清空指定连锁任务槽位；可能同时清除该槽位正在运行的任务，返回服务端确认的槽位。',
    'tasks.clear',
    object({ slot: { type: 'integer', minimum: 1, maximum: 10 } }),
    object({ slot: integer }),
    input => `/任务清空 ${input.slot}`,
    (data, input) => {
      const row = data as Record<string, unknown> | null;

      if (row?.slot !== input.slot) {
        throw new Error('任务槽位清空回执不匹配');
      }

      return row;
    },
    input => ({ slot: String(input.slot) })
  ),
  get_task_chain: observation(
    '查询连锁任务当前步骤或槽位配置。返回的 command 是待执行的游戏指令，仅供参考，不代表已执行；应使用相应的结构化能力。',
    'tasks.overview',
    empty,
    runtime,
    () => '/任务',
    parseBackendTaskRuntimeAction
  ),
  start_task_chain: mutation<{ slot: number }>(
    '启动已配置的连锁任务槽位并返回首个待执行指令；此调用不会执行该指令，也不会自动推进任务。',
    'tasks.start',
    object({ slot: { type: 'integer', minimum: 1, maximum: 10 } }),
    runtime,
    input => `/任务执行 ${input.slot}`,
    data => {
      const result = parseBackendTaskRuntimeAction(data);

      if (result.outcome !== 'started' || !result.command) {
        throw new Error('连锁任务启动回执不完整');
      }

      return result;
    },
    input => ({ slot: String(input.slot) })
  ),
  skip_task_chain_step: mutation(
    '跳过连锁任务的当前步骤；返回的下一条 command 仅为待执行指令，不代表已经执行。',
    'tasks.skip',
    empty,
    runtime,
    () => '/任务跳过',
    parseBackendTaskRuntimeAction
  ),
  cancel_task_chain: mutation(
    '取消当前连锁任务运行状态，不撤销已执行的游戏操作。',
    'tasks.cancel',
    empty,
    object({ cleared: boolean }),
    () => '/任务取消',
    parseBackendTaskRuntimeCancel
  )
};
