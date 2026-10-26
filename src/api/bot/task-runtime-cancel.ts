import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { TaskRuntimeCancelResult } from '../schemas/task-runtime-cancel';

export async function cancelBackendTaskRuntime(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<TaskRuntimeCancelResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'delete_players_id_tasks_runtime', { path: { id: uid }, ...context });

  return parseBackendTaskRuntimeCancel(data);
}

export function parseBackendTaskRuntimeCancel(value: unknown): TaskRuntimeCancelResult {
  const data = value as TaskRuntimeCancelResult;

  if (!data || typeof data !== 'object' || Array.isArray(data) || data.cleared !== true) {
    throw new Error('任务取消响应不完整');
  }

  return data;
}
