import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type ObjectValue = Record<string, unknown>;

function object(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('新人活动领取响应不完整');
  }

  return value as ObjectValue;
}

function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`新人活动领取响应缺少${field}`);
  }

  return value;
}

export type BackendNewcomerLoginClaim = {
  code: string;
  claimDay?: number;
  spiritCrystal?: number;
  grantedItems?: string[];
};
export type BackendNewcomerTaskClaim = {
  code: string;
  spiritCrystal?: number;
  vipExpYuan?: number;
  taskLabel?: string;
  required?: number;
  current?: number;
  unit?: string;
};

function loginClaim(value: unknown): BackendNewcomerLoginClaim {
  const row = object(value);

  if (
    typeof row.code !== 'string' ||
    !['OK', 'INVALID_USER', 'OUT_OF_PERIOD', 'ALL_CLAIMED', 'NO_CLAIMABLE', 'ALREADY_CLAIMED', 'CONFIG_MISSING'].includes(row.code)
  ) {
    throw new Error('新人活动领取响应缺少code');
  }
  const result: BackendNewcomerLoginClaim = { code: row.code };

  if (row.claimDay !== undefined) {
    result.claimDay = integer(row.claimDay, 'claimDay');
  }
  if (row.spiritCrystal !== undefined) {
    result.spiritCrystal = integer(row.spiritCrystal, 'spiritCrystal');
  }
  if (row.grantedItems !== undefined) {
    if (!Array.isArray(row.grantedItems) || !row.grantedItems.every(item => typeof item === 'string')) {
      throw new Error('新人活动领取奖励无效');
    }
    result.grantedItems = row.grantedItems;
  }

  return result;
}

function taskClaim(value: unknown): BackendNewcomerTaskClaim {
  const row = object(value);

  if (
    typeof row.code !== 'string' ||
    !['OK', 'INVALID_TASK_ID', 'INVALID_USER', 'OUT_OF_PERIOD', 'TASK_NOT_FOUND', 'NOT_UNLOCKED', 'INSUFFICIENT_PROGRESS', 'ALREADY_CLAIMED'].includes(row.code)
  ) {
    throw new Error('新人任务领取响应缺少code');
  }
  const result: BackendNewcomerTaskClaim = { code: row.code };

  for (const field of ['spiritCrystal', 'vipExpYuan', 'required', 'current'] as const) {
    if (row[field] !== undefined) {
      result[field] = integer(row[field], field);
    }
  }
  for (const field of ['taskLabel', 'unit'] as const) {
    if (row[field] !== undefined) {
      if (typeof row[field] !== 'string') {
        throw new Error(`新人任务领取响应缺少${field}`);
      }
      result[field] = row[field];
    }
  }

  return result;
}

export async function claimBackendNewcomerLogin(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<BackendNewcomerLoginClaim> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('新人活动领取参数无效');
  }

  return loginClaim(
    await requestBackend(bid, 'post_players_id_activities_newcomer_login_claim', {
      headers: repeatPresentationHeaders('初入仙途签到'),
      path: { id: uid },
      ...writeContext(request)
    })
  );
}

export async function claimBackendNewcomerTask(
  bid: string | undefined,
  uid: number,
  taskConfigId: number,
  request?: BackendRequestContext
): Promise<BackendNewcomerTaskClaim> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(taskConfigId) || taskConfigId <= 0) {
    throw new Error('新人任务领取参数无效');
  }

  return taskClaim(
    await requestBackend(bid, 'post_players_id_activities_newcomer_login_tasks_taskId_claim', {
      headers: repeatPresentationHeaders('新人任务领取'),
      path: { id: uid, taskId: taskConfigId },
      ...writeContext(request)
    })
  );
}
