import { validateBackendTaskConfigPage } from './task-config';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { TaskRuntimeAction, TaskRuntimeActionResult } from '../schemas/task-runtime-action';

const optionalText = (value: unknown) => value === undefined || typeof value === 'string';
const optionalIndex = (value: unknown) => value === undefined || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 10);

export async function runBackendTaskRuntimeAction(
  bid: string | undefined,
  uid: number,
  action: TaskRuntimeAction,
  input?: string,
  slot?: number,
  request?: BackendRequestContext
): Promise<TaskRuntimeActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const body: { action: TaskRuntimeAction; input?: string; slot?: number } = { action };

  if (input !== undefined) {
    body.input = input;
  }
  if (slot !== undefined) {
    body.slot = slot;
  }
  const data = await requestBackend(bid, 'post_players_id_tasks_runtime_actions', { path: { id: uid }, query: { page: true }, body, ...writeContext(request) });

  return parseBackendTaskRuntimeAction(data);
}

export function parseBackendTaskRuntimeAction(value: unknown): TaskRuntimeActionResult {
  const data = value as TaskRuntimeActionResult;

  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !['started', 'next', 'completed', 'expected', 'current', 'not_running', 'invalid_runtime', 'empty_slot', 'invalid_slot'].includes(data.outcome) ||
    !optionalText(data.command) ||
    !optionalText(data.executed) ||
    !optionalText(data.message) ||
    !optionalIndex(data.slot) ||
    !optionalIndex(data.step)
  ) {
    throw new Error('任务运行状态机响应不完整');
  }

  if (data.page !== undefined) {
    validateBackendTaskConfigPage(data.page);
  }

  return data;
}
