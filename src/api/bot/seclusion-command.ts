import { BackendAPIError, requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parseStatus, parseDungeon, type BackendSeclusionStatus, type BackendSeclusionDungeon } from './seclusion-status';
type Failure = { code: 'LOAD_FAILED'; data: { message: string } };
type SeclusionResults = {
  view: { code: 'OK'; data: BackendSeclusionStatus } | Failure;
  select:
    | { code: 'OK'; data: { status: BackendSeclusionStatus; dungeon: BackendSeclusionDungeon } }
    | { code: 'IN_SECLUSION'; data: { status: BackendSeclusionStatus } }
    | { code: 'DUNGEON_NOT_FOUND'; data: { message: string } }
    | Failure;
  start: { code: 'OK'; data: { dungeon: { id: number; name: string }; record: { duration: number; spiritCost: number; endTime?: string } } } | Failure;
};
function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('探索聚合响应不完整');
  }

  return value as Record<string, unknown>;
}
export async function executeBackendSeclusionCommand<A extends keyof SeclusionResults>(
  bid: string | undefined,
  uid: number,
  action: A,
  input: { dungeonName?: string; duration?: number } = {},
  request?: BackendRequestContext,
  load?: () => Promise<unknown>
): Promise<{ access: { canUseSoulPath: boolean }; result: SeclusionResults[A] }> {
  if (!bid) {
    throw new Error('探索请求缺少平台身份');
  }
  let value: Record<string, unknown>;

  try {
    value = row(
      load
        ? await load()
        : await requestBackend(bid, 'post_players_id_seclusion_command', {
            path: { id: uid },
            body: { action, ...input },
            ...(action === 'start' ? writeContext(request) : request ? { requestId: request.requestId } : {})
          })
    );
  } catch (error) {
    const message =
      action === 'view'
        ? '查看探索状态失败，请稍后再试'
        : action === 'select'
          ? '查看失败，请稍后再试'
          : error instanceof BackendAPIError
            ? error.message
            : '探索失败，请稍后再试';

    return { access: { canUseSoulPath: false }, result: { code: 'LOAD_FAILED', data: { message } } };
  }

  return parseSeclusionCommand(value, action);
}

export function parseSeclusionCommand<A extends keyof SeclusionResults>(
  input: unknown,
  action: A
): { access: { canUseSoulPath: boolean }; result: SeclusionResults[A] } {
  const value = row(input);
  const access = row(value.access),
    data = row(value.data);

  if (typeof access.canUseSoulPath !== 'boolean') {
    throw new Error('探索境界资格响应不完整');
  }
  let result: SeclusionResults[keyof SeclusionResults];

  if (value.code === 'LOAD_FAILED' || (action === 'select' && value.code === 'DUNGEON_NOT_FOUND')) {
    if (typeof data.message !== 'string') {
      throw new Error('探索错误说明缺失');
    }
    result = { code: value.code, data: { message: data.message } };
  } else if (action === 'view' && value.code === 'OK') {
    result = { code: 'OK', data: parseStatus(data.status) };
  } else if (action === 'select' && value.code === 'IN_SECLUSION') {
    result = { code: 'IN_SECLUSION', data: { status: parseStatus(data.status) } };
  } else if (action === 'select' && value.code === 'OK') {
    result = { code: 'OK', data: { status: parseStatus(data.status), dungeon: parseDungeon(data.dungeon, 0) } };
  } else if (action === 'start' && value.code === 'OK') {
    const dungeon = row(data.dungeon),
      record = row(data.record);

    if (typeof dungeon.id !== 'number' || typeof dungeon.name !== 'string' || typeof record.duration !== 'number' || typeof record.spiritCost !== 'number') {
      throw new Error('探索开始响应不完整');
    }
    result = {
      code: 'OK',
      data: {
        dungeon: { id: dungeon.id, name: dungeon.name },
        record: { duration: record.duration, spiritCost: record.spiritCost, endTime: typeof record.endTime === 'string' ? record.endTime : undefined }
      }
    };
  } else {
    throw new Error('探索聚合响应状态无效');
  }

  return { access: { canUseSoulPath: access.canUseSoulPath }, result: result as SeclusionResults[A] };
}
