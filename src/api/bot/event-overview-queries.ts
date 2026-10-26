import { formatGameTime } from '@src/utils/gameTime';
import { requestBackend } from './client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('活动总览数据不完整');
  }

  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('活动总览文本不完整');
  }

  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('活动总览数值不完整');
  }

  return value;
}
function date(value: unknown): string {
  const raw = text(value);

  if (!Number.isFinite(new Date(raw).getTime())) {
    throw new Error('活动总览时间不完整');
  }

  return formatGameTime(raw);
}
export async function getBackendEventOverview(bid: string | undefined, uid: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendEventOverview(await requestBackend(bid, 'get_players_id_limited_events', { path: { id: uid } }));
}
export function parseBackendEventOverview(data: unknown) {
  if (!Array.isArray(data)) {
    throw new Error('活动总览列表不完整');
  }

  return data.map(value => {
    const row = record(value);

    if (!Array.isArray(row.subActivities)) {
      throw new Error('活动阶段不完整');
    }

    return {
      eventId: number(row.eventId),
      eventTitle: text(row.eventTitle),
      description: row.description === null ? '' : text(row.description),
      startTime: date(row.startTime),
      endTime: date(row.endTime),
      paidTokenName: text(row.paidTokenName),
      freeTokenName: text(row.freeTokenName),
      paidToken: number(row.paidToken),
      freeToken: number(row.freeToken),
      subActivities: row.subActivities.map(value => {
        const sub = record(value);

        number(sub.id);
        if (typeof sub.isActive !== 'boolean') {
          throw new Error('活动阶段状态不完整');
        }

        return { subTitle: text(sub.title), startTime: date(sub.startTime), endTime: date(sub.endTime), isActive: sub.isActive };
      })
    };
  });
}
