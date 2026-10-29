import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parsePositiveIssuedRewards, type IssuedReward } from '../schemas/issued-reward';

export type BackendActivityIssuedReward = IssuedReward;
export type BackendActivityClaim = {
  userName: string;
  requiredPoints: number;
  issued: BackendActivityIssuedReward[];
  treasureMapBackfillOnly?: boolean;
  treasureMapsUnavailableReason?: string;
  treasureMaps?: { week: string; requiredPoints: number; itemId: number; quantity: number; alreadyGranted: boolean; configVersion: string };
};
export type BackendActivityClaimAll = {
  claimed: BackendActivityClaim[];
  partial: boolean;
  userName?: string;
  taskRewards?: BackendActivityIssuedReward[];
  error?: string;
};

function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('活跃奖励响应不完整');
  }

  return value as Record<string, unknown>;
}

export function parseBackendActivityClaim(value: unknown): BackendActivityClaim {
  const item = row(value);

  if (typeof item.userName !== 'string' || typeof item.requiredPoints !== 'number' || !Number.isSafeInteger(item.requiredPoints) || item.requiredPoints <= 0) {
    throw new Error('活跃奖励响应不完整');
  }

  if (item.treasureMapBackfillOnly !== undefined && typeof item.treasureMapBackfillOnly !== 'boolean') {
    throw new Error('周活补图回执不完整');
  }
  if (item.treasureMapsUnavailableReason !== undefined && typeof item.treasureMapsUnavailableReason !== 'string') {
    throw new Error('周活藏宝图回执不完整');
  }

  let treasureMaps: BackendActivityClaim['treasureMaps'];

  if (item.treasureMaps !== undefined && item.treasureMaps !== null) {
    const grant = row(item.treasureMaps);

    if (
      typeof grant.week !== 'string' ||
      typeof grant.configVersion !== 'string' ||
      typeof grant.alreadyGranted !== 'boolean' ||
      !['requiredPoints', 'itemId', 'quantity'].every(key => Number.isSafeInteger(grant[key]) && Number(grant[key]) > 0)
    ) {
      throw new Error('周活藏宝图回执不完整');
    }
    treasureMaps = {
      week: grant.week,
      requiredPoints: grant.requiredPoints as number,
      itemId: grant.itemId as number,
      quantity: grant.quantity as number,
      alreadyGranted: grant.alreadyGranted,
      configVersion: grant.configVersion
    };
  }

  return {
    userName: item.userName,
    requiredPoints: item.requiredPoints,
    issued: parsePositiveIssuedRewards(item.issued, '活跃奖励响应不完整'),
    ...(item.treasureMapBackfillOnly !== undefined ? { treasureMapBackfillOnly: item.treasureMapBackfillOnly } : {}),
    ...(typeof item.treasureMapsUnavailableReason === 'string' ? { treasureMapsUnavailableReason: item.treasureMapsUnavailableReason } : {}),
    ...(treasureMaps ? { treasureMaps } : {})
  };
}

export async function claimBackendActivityReward(
  bid: string | undefined,
  uid: number,
  type: 'daily' | 'weekly',
  requiredPoints: number,
  request?: BackendRequestContext
): Promise<BackendActivityClaim> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(requiredPoints) || requiredPoints <= 0) {
    throw new Error('活跃奖励领取参数无效');
  }

  return parseBackendActivityClaim(
    await requestBackend(bid, 'post_players_id_activities_rewardType_claim', {
      path: { id: uid, rewardType: type },
      body: { requiredPoints },
      ...writeContext(request)
    })
  );
}

export async function claimAllBackendActivityRewards(
  bid: string | undefined,
  uid: number,
  type: 'daily' | 'weekly',
  request?: BackendRequestContext
): Promise<BackendActivityClaimAll> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('活跃奖励领取参数无效');
  }

  return parseBackendActivityClaimAll(
    await requestBackend(bid, 'post_players_id_activities_rewardType_claim_all', {
      path: { id: uid, rewardType: type },
      ...writeContext(request)
    })
  );
}

export function parseBackendActivityClaimAll(value: unknown): BackendActivityClaimAll {
  const result = row(value);

  if (
    !Array.isArray(result.claimed) ||
    typeof result.partial !== 'boolean' ||
    (result.error !== undefined && typeof result.error !== 'string') ||
    (result.userName !== undefined && typeof result.userName !== 'string')
  ) {
    throw new Error('活跃奖励响应不完整');
  }

  const taskRewards = result.taskRewards === undefined ? [] : parsePositiveIssuedRewards(result.taskRewards, '活跃任务奖励响应不完整');

  if (result.claimed.length === 0 && (taskRewards.length === 0 || typeof result.userName !== 'string' || !result.userName.trim())) {
    throw new Error('活跃奖励响应不完整');
  }

  return {
    ...(typeof result.userName === 'string' ? { userName: result.userName } : {}),
    ...(result.taskRewards !== undefined ? { taskRewards } : {}),
    claimed: result.claimed.map(parseBackendActivityClaim),
    partial: result.partial,
    ...(typeof result.error === 'string' ? { error: result.error } : {})
  };
}
