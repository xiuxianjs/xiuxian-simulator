import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendActivatedTitle = { id: number; title: string; isActive: boolean };
export type BackendDeactivatedTitle = { removed: boolean };

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('称号操作响应不完整');
  }

  return value as Record<string, unknown>;
}

export async function activateBackendTitle(
  bid: string | undefined,
  uid: number,
  titleId: number,
  request?: BackendRequestContext
): Promise<BackendActivatedTitle> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(titleId) || titleId <= 0) {
    throw new Error('佩戴称号参数无效');
  }
  const result = await requestBackend(bid, 'post_players_id_titles_titleId_activate', {
    path: { id: uid, titleId },
    ...writeContext(request)
  });

  return validateBackendActivatedTitle(result, titleId);
}

export function validateBackendActivatedTitle(data: unknown, titleId: number): BackendActivatedTitle {
  const row = object(data);

  if (row.id !== titleId || typeof row.title !== 'string' || typeof row.isActive !== 'boolean' || !row.isActive) {
    throw new Error('佩戴称号响应不完整');
  }

  return { id: row.id, title: row.title, isActive: row.isActive };
}

export async function deactivateBackendTitle(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<BackendDeactivatedTitle> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('卸下称号参数无效');
  }
  const result = await requestBackend(bid, 'post_players_id_titles_deactivate', {
    path: { id: uid },
    ...writeContext(request)
  });

  return validateBackendDeactivatedTitle(result);
}

export function validateBackendDeactivatedTitle(data: unknown): BackendDeactivatedTitle {
  const row = object(data);

  if (typeof row.removed !== 'boolean') {
    throw new Error('卸下称号响应不完整');
  }

  return { removed: row.removed };
}
