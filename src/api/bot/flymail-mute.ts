import type { FlyMailMuteContext, FlyMailMuteStateResult } from '../schemas/flymail-mute';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('飞信禁言接口响应不完整');
  }

  return value as Record<string, unknown>;
}
function nullableText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}
function outcome(value: unknown): value is FlyMailMuteStateResult['outcome'] {
  return value === 'updated' || value === 'self' || value === 'not_found' || value === 'locked';
}
export function parseMuteState(value: unknown): FlyMailMuteStateResult {
  const data = record(value);

  if (
    !outcome(data.outcome) ||
    !nullableText(data.targetName) ||
    !nullableText(data.realmName) ||
    (data.outcome === 'updated' && (typeof data.targetName !== 'string' || data.targetName === '')) ||
    (data.outcome !== 'updated' && data.targetName !== null)
  ) {
    throw new Error('飞信禁言状态响应不完整');
  }

  return { outcome: data.outcome, targetName: data.targetName, realmName: data.realmName };
}
function parseMuteContext(value: unknown): FlyMailMuteContext {
  const data = record(value);

  if (
    typeof data.allowed !== 'boolean' ||
    !nullableText(data.realmName) ||
    (data.targetUid !== null && (typeof data.targetUid !== 'number' || !Number.isSafeInteger(data.targetUid) || data.targetUid <= 0))
  ) {
    throw new Error('飞信禁言资格响应不完整');
  }

  return { allowed: data.allowed, realmName: data.realmName, targetUid: data.targetUid };
}
export async function getBackendFlyMailMuteContext(bid: string | undefined, uid: number, targetBid?: string): Promise<FlyMailMuteContext> {
  if (!bid?.trim()) {
    throw new Error('查询缺少平台身份');
  }

  return parseMuteContext(
    await requestBackend(bid, 'get_players_id_flymail_mute_context', {
      path: { id: uid },
      ...(targetBid ? { query: { targetBid } } : {})
    })
  );
}
export async function setBackendFlyMailMute(
  bid: string | undefined,
  uid: number,
  targetId: number,
  muted: boolean,
  request?: BackendRequestContext
): Promise<FlyMailMuteStateResult> {
  if (!bid?.trim()) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const op = muted ? 'post_players_id_flymail_mutes_targetId' : 'delete_players_id_flymail_mutes_targetId';

  return parseMuteState(await requestBackend(bid, op, { path: { id: uid, targetId }, ...context }));
}

export async function commandBackendFlyMailMute(
  bid: string | undefined,
  uid: number,
  targetUid: number,
  targetBid: string | undefined,
  muted: boolean,
  request?: BackendRequestContext
) {
  if (!bid?.trim()) {
    throw new Error('操作缺少平台身份');
  }
  const data = record(
    await requestBackend(bid, 'post_players_id_flymail_mute_command', {
      path: { id: uid },
      body: { targetUid, ...(targetBid ? { targetBid } : {}), muted },
      requestId: request?.requestId,
      idempotencyKey: request?.idempotencyKey
    })
  );
  const access = parseMuteContext(data.access);
  const result = data.result === null ? null : parseMuteState(data.result);

  return { access: access, result: result };
}

export function parseRobotFlyMailMute(value: unknown) {
  const out = parseMuteState(value);

  if (out.outcome !== 'updated') {
    throw new Error('飞信禁言状态响应不完整');
  }

  return out;
}
