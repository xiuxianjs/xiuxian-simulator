import { requestBackend } from './client';
import { PAGE_SIZE } from '@src/constants';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('悬赏接口返回格式不完整');
  }

  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('悬赏接口缺少数值字段');
  }

  return value;
}
function name(value: unknown): string {
  if (value === null) {
    return '未知';
  }
  if (typeof value !== 'string') {
    throw new Error('悬赏接口缺少名称字段');
  }

  return value;
}
export async function getBackendBounties(bid: string | undefined, page: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendBounties(await requestBackend(bid, 'get_bounties', { query: { page, pageSize: PAGE_SIZE } }), page);
}

export function parseBackendBounties(value: unknown, page: number) {
  const data = record(value);

  if (!Array.isArray(data.items) || number(data.pageSize) !== PAGE_SIZE || number(data.page) !== page) {
    throw new Error('悬赏接口分页不完整');
  }

  return {
    total: number(data.total),
    list: data.items.map((value: unknown) => {
      const row = record(value);
      const expiresAt = new Date(typeof row.expiresAt === 'string' ? row.expiresAt : '');

      if (!Number.isFinite(expiresAt.getTime())) {
        throw new Error('悬赏接口日期无效');
      }

      return {
        id: number(row.id),
        publisherName: name(row.publisherName),
        targetName: name(row.targetName),
        targetUid: number(row.targetUid),
        rewardPerCompletion: number(row.rewardPerCompletion),
        maxCompletions: number(row.maxCompletions),
        completedCount: number(row.completedCount),
        remainingSlots: number(row.remainingSlots),
        hoursLeft: number(row.hoursLeft),
        expiresAt
      };
    })
  };
}

export function parseRobotBountyList(value: unknown) {
  const page = number(record(value).page);
  const data = parseBackendBounties(value, page);

  return { ...data, page, totalPages: Math.ceil(data.total / PAGE_SIZE) };
}
