import { validateBackendTaskConfigPage } from './task-config';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { TaskConfigActionResult } from '../schemas/task-config-action';

function valid(value: unknown): value is TaskConfigActionResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const data: Record<string, unknown> = value as Record<string, unknown>;

  return (
    typeof data.outcome === 'string' &&
    ['saved', 'invalid_slot', 'invalid_step', 'empty', 'too_long', 'nested', 'out_of_order', 'alias_too_long'].includes(data.outcome) &&
    typeof data.alias === 'string' &&
    Array.isArray(data.steps) &&
    data.steps.every(step => typeof step === 'string')
  );
}
export async function setBackendTaskSlotStep(
  bid: string | undefined,
  uid: number,
  slot: number,
  step: number,
  content: string,
  request?: BackendRequestContext
) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_tasks_slots_slot_steps', {
    path: { id: uid, slot },
    body: { step, content },
    ...writeContext(request)
  });

  if (!valid(data)) {
    throw new Error('任务步骤设置响应不完整');
  }

  if (data.page !== undefined) {
    validateBackendTaskConfigPage(data.page);
  }

  return data;
}
export async function setBackendTaskSlotAlias(bid: string | undefined, uid: number, slot: number, alias: string, request?: BackendRequestContext) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'put_players_id_tasks_slots_slot_alias', { path: { id: uid, slot }, body: { alias }, ...writeContext(request) });

  if (!valid(data)) {
    throw new Error('任务别名设置响应不完整');
  }

  if (data.page !== undefined) {
    validateBackendTaskConfigPage(data.page);
  }

  return data;
}
