import type { TaskConfigPage } from '../schemas/task-config-page';
import { requestBackend } from './client';
import type { BackendRequestContext } from './context';
import type { TaskConfigLimits } from '../schemas/tasks-config-limits';
import type { TaskConfigData, TaskState } from '../schemas/tasks';

export type TaskConfigState = TaskState & { config: TaskConfigData };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const validConfig = (value: unknown): value is TaskConfigData => record(value) &&
  Array.isArray(value.slots) &&
  value.slots.length === 10 &&
  value.slots.every(slot => record(slot) && typeof slot.alias === 'string' && Array.isArray(slot.steps) && slot.steps.every(step => typeof step === 'string'));

export const validLimits = (value: unknown): value is TaskConfigLimits => record(value) &&
  typeof value.isMonthCard === 'boolean' &&
  value.slotCount === (value.isMonthCard ? 10 : 5) &&
  value.maxSteps === (value.isMonthCard ? 10 : 8);

export async function getBackendTaskConfig(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<TaskConfigState> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_tasks', { path: { id: uid }, requestId: request?.requestId });

  if (!record(data) || typeof data.version !== 'string' || !data.version || !validConfig(data.config) || !validLimits(data)) {
    throw new Error('任务配置接口返回不完整');
  }

  return data as TaskConfigState;
}

export async function getBackendTaskConfigLimits(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<TaskConfigLimits> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_tasks_limits', { path: { id: uid }, requestId: request?.requestId });

  if (!validLimits(data)) {
    throw new Error('任务权益接口返回不完整');
  }

  return data;
}

export async function getBackendTaskConfigPage(bid: string | undefined, uid: number, request?: BackendRequestContext) {
  const state = await getBackendTaskConfig(bid, uid, request);

  return { config: state.config, limits: { slotCount: state.slotCount, maxSteps: state.maxSteps, isMonthCard: state.isMonthCard } };
}

export function validateBackendTaskConfigPage(value: unknown): TaskConfigPage {
  if (!record(value) || !validConfig(value.config) || !validLimits(value.limits)) {
    throw new Error('任务展示配置响应不完整');
  }

  return value as TaskConfigPage;
}
