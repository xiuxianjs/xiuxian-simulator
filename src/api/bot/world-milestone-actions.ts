import { parseNonNegativeIssuedRewards } from '../schemas/issued-reward';
import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('世界里程碑领取响应不完整');
  }

  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error('世界里程碑领取响应不完整');
  }

  return value;
}

export async function claimBackendWorldMilestones(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext
): Promise<ReturnType<typeof parseBackendWorldMilestoneClaim>> {
  if (!bid?.trim()) {
    throw new Error('操作缺少平台身份');
  }

  if (!Number.isSafeInteger(uid) || uid < 1) {
    throw new Error('世界里程碑领取参数无效');
  }

  return parseBackendWorldMilestoneClaim(
    await requestBackend(bid, 'post_players_id_recharge_world_milestones_claim_all', {
      headers: repeatPresentationHeaders('里程碑奖励'),
      path: { id: uid },
      ...writeContext(request)
    })
  );
}

export function parseBackendWorldMilestoneClaim(value: unknown) {
  const data = record(value);

  if (data.partial !== false || !Array.isArray(data.claimed)) {
    throw new Error('世界里程碑领取响应不完整');
  }

  const issued = data.claimed.flatMap(value => {
    const claim = record(value);

    positiveInteger(claim.milestoneOrder);

    return parseNonNegativeIssuedRewards(claim.issued, '世界里程碑奖励明细不完整');
  });

  if (data.claimed.length < 1) {
    throw new Error('世界里程碑领取响应不完整');
  }

  return { count: data.claimed.length, issued };
}
