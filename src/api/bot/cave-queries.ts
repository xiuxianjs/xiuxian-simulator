import type { CaveLogQueryData } from '../schemas/cave-query';
import { requestBackend } from './client';

function count(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
}

export async function getBackendCaveLogs(bid: string | undefined, uid: number, page = 1): Promise<CaveLogQueryData> {
  if (!bid?.trim()) {
    throw new Error('查询缺少平台身份');
  }
  if (!Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('洞府记录查询参数无效');
  }
  const requestedPage = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.floor(page) || 1));
  const data: unknown = await requestBackend(bid, 'get_players_id_cave_logs', { path: { id: uid }, query: { page: requestedPage, pageSize: 5 } });

  return parseBackendCaveLogs(data);
}

export function parseBackendCaveLogs(data: unknown): CaveLogQueryData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('洞府记录接口返回格式不完整');
  }
  const row = data as Record<string, unknown>;

  if (
    (row.realmName !== null && typeof row.realmName !== 'string') ||
    typeof row.canUseCave !== 'boolean' ||
    typeof row.lockedMessage !== 'string' ||
    typeof row.hasCavePlot !== 'boolean' ||
    !Array.isArray(row.logs) ||
    !row.logs.every(value => typeof value === 'string') ||
    !count(row.page, 1) ||
    !count(row.total) ||
    !count(row.totalPages, 1) ||
    row.page > row.totalPages ||
    (row.nextCursor !== undefined && typeof row.nextCursor !== 'string')
  ) {
    throw new Error('洞府记录接口返回格式不完整');
  }

  return {
    realmName: row.realmName,
    canUseCave: row.canUseCave,
    lockedMessage: row.lockedMessage,
    hasCavePlot: row.hasCavePlot,
    logs: [...row.logs],
    page: row.page,
    total: row.total,
    totalPages: row.totalPages,
    ...(typeof row.nextCursor === 'string' ? { nextCursor: row.nextCursor } : {})
  };
}
