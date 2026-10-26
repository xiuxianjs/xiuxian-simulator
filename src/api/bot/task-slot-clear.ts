import { getBackendTaskConfigLimits, validLimits } from './task-config';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export async function clearBackendTaskSlotWithLimits(bid: string | undefined, uid: number, slot: number, request?: BackendRequestContext) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  if (!request?.idempotencyKey) {
    const limits = await getBackendTaskConfigLimits(bid, uid, request);

    if (!(Number.isInteger(slot) && slot >= 1 && slot <= limits.slotCount)) {
      return { outcome: 'invalid_slot' as const, limits };
    }
  }
  const data = await requestBackend(bid, 'post_players_id_tasks_config_actions', {
    path: { id: uid },
    body: { action: 'clear', slot: Number.isInteger(slot) ? slot : 0 },
    ...writeContext(request)
  });

  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !('limits' in data) ||
    !validLimits(data.limits) ||
    (data.result !== undefined &&
      (!data.result ||
        typeof data.result !== 'object' ||
        Array.isArray(data.result) ||
        data.result.cleared !== true ||
        typeof data.result.runtimeCleared !== 'boolean')) ||
    (data.outcome !== 'invalid_slot' && (data.outcome !== 'cleared' || data.result === undefined))
  ) {
    throw new Error('任务清空响应不完整');
  }

  return data;
}
