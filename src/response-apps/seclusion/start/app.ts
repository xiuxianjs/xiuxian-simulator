import { BackendAPIError } from '@src/api';
import { requestBackend, writeContext } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';

type SeclusionStartResult =
  | {
      code: 'OK';
      data: {
        dungeon: { id: number; name: string };
        record: { duration: number; spiritCost: number; endTime?: string };
      };
    }
  | { code: 'UNAVAILABLE'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

function parseStartedRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('探索开始响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (typeof row.duration !== 'number' || typeof row.spiritCost !== 'number') {
    throw new Error('探索开始响应不完整');
  }

  return { duration: row.duration, spiritCost: row.spiritCost, endTime: typeof row.endTime === 'string' ? row.endTime : undefined };
}

export default async function App(params: {
  bid?: string;
  uid: number;
  dungeonName: string;
  hours: number;
  request?: BackendRequestContext;
}): Promise<SeclusionStartResult> {
  try {
    if (!params.bid) {
      throw new Error('探索请求缺少平台身份');
    }
    await requestBackend(params.bid, 'post_players_id_seclusion_active_marker_repair', { path: { id: params.uid } });
    const value = await requestBackend(params.bid, 'post_players_id_seclusion_start_by_name', {
      path: { id: params.uid },
      body: { dungeonName: params.dungeonName, duration: params.hours },
      ...writeContext(params.request)
    });

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('探索开始响应不完整');
    }
    const row = value as Record<string, unknown>;
    const dungeon = row.dungeon as Record<string, unknown> | undefined;

    if (!dungeon || typeof dungeon.id !== 'number' || typeof dungeon.name !== 'string') {
      throw new Error('探索开始响应不完整');
    }

    return { code: 'OK', data: { dungeon: { id: dungeon.id, name: dungeon.name }, record: parseStartedRecord(row.record) } };
  } catch (error) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof BackendAPIError ? error.message : '探索失败，请稍后再试' } };
  }
}
