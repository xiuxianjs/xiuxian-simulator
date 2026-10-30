import { validateBackendTaskConfigPage } from '../api/bot/task-config';
import { parseBackendTaskRuntimeAction } from '../api/bot/task-runtime-action';
import { parseBackendTaskRuntimeCancel } from '../api/bot/task-runtime-cancel';
import { parseRobotTaskPanel } from '../api/bot/task-panel-view';
import { ExposeError } from 'alemonjs';
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, object, text } from './schema';

const empty = object({});
const taskPanelTabs = [
  'checkin',
  'activity',
  'cultivation',
  'dungeon',
  'guild',
  'master',
  'companion',
  'event',
  'auto',
  '签到',
  '活跃',
  '修炼',
  '副本',
  '宗门',
  '师门',
  '道侣',
  '活动',
  '自动'
];

function taskPanelInput(input: { tab?: string; taskInput: string }) {
  const command = input.taskInput
    .trim()
    .replace(/^[!！/#＃]\s*/, '')
    .trim();
  const match = command.match(/^(?:任务面板|修仙面板)(?:\s+(\S+))?$/u);
  const tab = match?.[1] ?? '';

  if (!match || (tab && !taskPanelTabs.includes(tab)) || (input.tab !== undefined && input.tab !== tab)) {
    throw new ExposeError('INVALID_INPUT', '任务面板指令与分类不匹配');
  }

  return { command: `/${command}`, tab };
}
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

const taskPanel = object(
  {
    requestedTab: text,
    defaultTabKey: text,
    selection: object({ tabKey: text }, ['tabKey']),
    tabs: list(
      object({
        tabKey: text,
        tabName: text,
        visible: boolean,
        hasActionable: boolean,
        items: list(
          object(
            {
              label: text,
              statusText: text,
              status: { type: 'string', enum: ['ACTIONABLE', 'IN_PROGRESS', 'COMPLETED', 'UNAVAILABLE', 'ERROR'] },
              priority: integer,
              visible: boolean,
              command: text,
              actionLabel: text,
              options: list(object({ label: text, command: text }))
            },
            ['command', 'actionLabel', 'options']
          )
        )
      })
    )
  },
  ['selection']
);

export const taskActions = {
  get_task_panel: observation<{ tab?: string }>(
    '查询任务面板选中分类的服务端状态，包括师门、道侣和条目的操作选项；command 仅作提示，不会执行。其他分类仅返回导航信息。',
    'task-panel.view',
    object(
      {
        tab: {
          type: 'string',
          enum: [
            'checkin',
            'activity',
            'cultivation',
            'dungeon',
            'guild',
            'master',
            'companion',
            'event',
            'auto',
            '签到',
            '活跃',
            '修炼',
            '副本',
            '宗门',
            '师门',
            '道侣',
            '活动',
            '自动'
          ]
        }
      },
      ['tab']
    ),
    taskPanel,
    input => `/任务面板${input.tab ? ` ${input.tab}` : ''}`,
    parseRobotTaskPanel,
    input => ({ tab: input.tab ?? '' })
  ),
  execute_task_panel: mutation<{ tab?: string; taskInput: string; intentId?: string }>(
    '执行连锁任务中的任务面板或修仙面板查看步骤；分类从任务指令读取，指定 tab 时必须一致。先推进任务再查询面板，分别检查回执；新操作使用新 intentId，同次重试沿用原编号。',
    'task-panel.view',
    object(
      {
        tab: {
          type: 'string',
          enum: [
            'checkin',
            'activity',
            'cultivation',
            'dungeon',
            'guild',
            'master',
            'companion',
            'event',
            'auto',
            '签到',
            '活跃',
            '修炼',
            '副本',
            '宗门',
            '师门',
            '道侣',
            '活动',
            '自动'
          ]
        },
        taskInput: taskInputSchema,
        intentId: intentIdSchema
      },
      ['tab', 'intentId']
    ),
    taskPanel,
    input => taskPanelInput(input).command,
    parseRobotTaskPanel,
    input => ({ tab: taskPanelInput(input).tab }),
    input => {
      validateIntentId(input.intentId);
      taskPanelInput(input);
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  set_task_chain_step: mutation<{ slot: number; step: number; content: string; intentId?: string }>(
    '设置连锁任务槽位中的指定步骤，仅保存指令文本，不执行指令；服务端校验槽位、顺序和内容。同消息中新编辑使用新 intentId，同次重试沿用原编号。',
    'tasks.settings',
    object(
      {
        slot: { type: 'integer', minimum: 1, maximum: 10 },
        step: { type: 'integer', minimum: 1, maximum: 10 },
        content: { type: 'string', minLength: 1, maxLength: 50 },
        intentId: intentIdSchema
      },
      ['intentId']
    ),
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
    input => ({ slot: String(input.slot), step: String(input.step), content: input.content }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  ),
  set_task_chain_alias: mutation<{ slot: number; alias: string; intentId?: string }>(
    '设置连锁任务槽位别名，服务端负责别名和槽位限制；返回更新后的配置。同消息中新编辑使用新 intentId，同次重试沿用原编号。',
    'tasks.alias',
    object({ slot: { type: 'integer', minimum: 1, maximum: 10 }, alias: { type: 'string', minLength: 1, maxLength: 12 }, intentId: intentIdSchema }, [
      'intentId'
    ]),
    object({ mode: { type: 'string', enum: ['overview'] }, page }),
    input => `/任务别名 ${input.slot} ${input.alias}`,
    data => {
      const row = data as Record<string, unknown> | null;

      if (row?.mode !== 'overview') {
        throw new Error('任务别名设置回执不完整');
      }

      return { mode: row.mode, page: validateBackendTaskConfigPage(row.page) };
    },
    input => ({ slot: String(input.slot), alias: input.alias }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  ),
  clear_task_chain_slot: mutation<{ slot: number; intentId?: string }>(
    '清空指定连锁任务槽位；可能同时清除该槽位正在运行的任务，返回服务端确认的槽位。同消息中新操作使用新 intentId，同次重试沿用原编号。',
    'tasks.clear',
    object({ slot: { type: 'integer', minimum: 1, maximum: 10 }, intentId: intentIdSchema }, ['intentId']),
    object({ slot: integer }),
    input => `/任务清空 ${input.slot}`,
    (data, input) => {
      const row = data as Record<string, unknown> | null;

      if (row?.slot !== input.slot) {
        throw new Error('任务槽位清空回执不匹配');
      }

      return row;
    },
    input => ({ slot: String(input.slot) }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  ),
  get_task_chain: observation(
    '查询连锁任务当前步骤或槽位配置。返回的 command 是待执行的游戏指令，仅供参考，不代表已执行；应使用相应的结构化能力。',
    'tasks.overview',
    empty,
    runtime,
    () => '/任务',
    parseBackendTaskRuntimeAction
  ),
  start_task_chain: mutation<{ slot: number; intentId?: string }>(
    '启动已配置的连锁任务槽位并返回首个待执行指令，不自动执行或推进。同消息新启动使用新 intentId，同次重试沿用原编号。',
    'tasks.start',
    object({ slot: { type: 'integer', minimum: 1, maximum: 10 }, intentId: intentIdSchema }, ['intentId']),
    runtime,
    input => `/任务执行 ${input.slot}`,
    data => {
      const result = parseBackendTaskRuntimeAction(data);

      if (result.outcome !== 'started' || !result.command) {
        throw new Error('连锁任务启动回执不完整');
      }

      return result;
    },
    input => ({ slot: String(input.slot) }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  ),
  skip_task_chain_step: mutation<{ intentId?: string }>(
    '跳过连锁任务当前步骤，先核对 get_task_chain 的当前状态；返回的下一条 command 不代表已执行。同消息新跳过使用新 intentId，同次重试沿用原编号。',
    'tasks.skip',
    object({ intentId: intentIdSchema }, ['intentId']),
    runtime,
    () => '/任务跳过',
    parseBackendTaskRuntimeAction,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  ),
  cancel_task_chain: mutation<{ intentId?: string }>(
    '取消当前连锁任务运行状态，不撤销已执行操作。同消息新取消使用新 intentId，同次重试沿用原编号。',
    'tasks.cancel',
    object({ intentId: intentIdSchema }, ['intentId']),
    object({ cleared: boolean }),
    () => '/任务取消',
    parseBackendTaskRuntimeCancel,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  )
};
