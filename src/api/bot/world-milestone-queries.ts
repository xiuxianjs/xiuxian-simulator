import { requestBackendQueryPresentation } from './query-presentation';
import type { BackendRequestContext } from './context';
import { requestBackend } from './client';
import type { WorldMilestoneViewResult } from '../schemas/world-milestone-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('世界里程碑响应不完整');
  }

  return value as Record<string, unknown>;
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('世界里程碑数值字段不完整');
  }

  return value;
}

function nullableNumber(value: unknown): number | null {
  return value === null ? null : number(value);
}

function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('世界里程碑展示字段不完整');
  }

  return value;
}

export async function getBackendWorldMilestoneView(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<WorldMilestoneViewResult> {
  if (!bid?.trim()) {
    throw new Error('查询缺少平台身份');
  }

  if (!Number.isSafeInteger(uid) || uid < 1) {
    throw new Error('世界里程碑查询参数无效');
  }

  return parseBackendWorldMilestoneView(
    request
      ? await requestBackendQueryPresentation(bid, uid, 'world_milestones', '里程碑奖励', request)
      : await requestBackend(bid, 'get_players_id_recharge_world_milestones', { path: { id: uid } })
  );
}

export function parseBackendWorldMilestoneView(value: unknown): WorldMilestoneViewResult {
  const data = record(value);

  if (typeof data.empty !== 'boolean' || !Array.isArray(data.milestones)) {
    throw new Error('世界里程碑响应不完整');
  }
  if (data.empty) {
    return { code: 'EMPTY' };
  }

  const worldCountText = text(data.worldCountText);
  const nextMilestoneCount = nullableNumber(data.nextMilestoneCount);
  const nextMilestoneGapText = text(data.nextMilestoneGapText);
  const unclaimedCount = number(data.unclaimedCount);
  const milestones = data.milestones.map(value => {
    const milestone = record(value);

    return {
      milestoneCount: number(milestone.milestoneCount),
      status: text(milestone.statusText),
      rewardText: text(milestone.rewardText)
    };
  });

  return { code: 'VIEW', worldCountText, nextMilestoneCount, nextMilestoneGapText, unclaimedCount, milestones };
}
