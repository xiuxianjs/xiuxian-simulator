import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

export type CheckInHubEntry = { name: string; status: 'done' | 'skip' | 'error'; message: string };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const status = (value: unknown): value is CheckInHubEntry['status'] => value === 'done' || value === 'skip' || value === 'error';

export async function postBackendCheckInHub(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<CheckInHubEntry[]> {
  if (!bid?.trim()) {
    throw new Error('签到缺少平台身份');
  }
  if (!Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('签到玩家参数无效');
  }
  const data = await requestBackend(bid, 'post_players_id_check_ins_hub', { path: { id: uid }, ...writeContext(request) });

  return parseCheckInHub(data);
}

export function parseCheckInHub(data: unknown): CheckInHubEntry[] {
  if (!record(data) || !Array.isArray(data.results)) {
    throw new Error('统一签到响应不完整');
  }

  return data.results.map(row => {
    if (!record(row) || typeof row.name !== 'string' || !status(row.status) || typeof row.message !== 'string') {
      throw new Error('统一签到回执字段不完整');
    }

    return { name: row.name, status: row.status, message: row.message };
  });
}
