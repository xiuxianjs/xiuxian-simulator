import { requestBackend } from './client';
import { parseLimitedEventRewardFields, parseLimitedEventRewardNames } from './limited-event-reward-parser';
import type { EventTaskQueryGroup } from '../schemas/event-tasks-query';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('活动任务接口不完整');
  }

  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('活动任务接口缺少文本');
  }

  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('活动任务接口缺少数值');
  }

  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('活动任务接口缺少状态');
  }

  return value;
}
function textParts(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(part => typeof part !== 'string')) {
    throw new Error('活动任务接口缺少奖励描述');
  }

  return value as string[];
}
export async function getBackendEventTasks(bid: string | undefined, uid: number): Promise<EventTaskQueryGroup[]> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendEventTasks(await requestBackend(bid, 'get_players_id_limited_events_tasks', { path: { id: uid } }));
}
export function parseBackendEventTasks(data: unknown): EventTaskQueryGroup[] {
  if (!Array.isArray(data)) {
    throw new Error('活动任务接口缺少列表');
  }

  return data.map(value => {
    const group = object(value);

    if (!Array.isArray(group.tasks)) {
      throw new Error('活动任务接口缺少任务');
    }

    return {
      eventTitle: text(group.eventTitle),
      subTitle: text(group.subTitle),
      paidTokenName: text(group.paidTokenName),
      freeTokenName: text(group.freeTokenName),
      rewardNames: parseLimitedEventRewardNames(group.rewardNames),
      tasks: group.tasks.map(value => {
        const row = object(value);

        return {
          taskId: number(row.taskId),
          taskName: text(row.taskName),
          taskDescription: text(row.taskDescription),
          targetValue: number(row.targetValue),
          currentValue: number(row.currentValue),
          completed: boolean(row.completed),
          claimed: boolean(row.claimed),
          canClaim: boolean(row.canClaim),
          rewardTextParts: textParts(row.rewardTextParts),
          rewardFields: parseLimitedEventRewardFields(row.rewardFields)
        };
      })
    };
  });
}
