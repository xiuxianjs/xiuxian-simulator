import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { ThemeActivateResult, ThemeDeactivateResult } from '../schemas/theme-state';

export async function activateBackendTheme(
  bid: string | undefined,
  uid: number,
  themeId: number,
  request?: BackendRequestContext
): Promise<ThemeActivateResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);

  if (!Number.isFinite(themeId) || !Number.isInteger(themeId)) {
    throw new Error('主题编号超出可查询范围');
  }
  // Node parses the command as Number before SQL lookup; retain that precision.
  if (themeId >= 1e21 || BigInt(themeId.toString()) > 9223372036854775807n) {
    return { outcome: 'not_found', id: null, name: null };
  }
  const data = await requestBackend(bid, 'post_players_id_themes_themeId_activate', { path: { id: uid, themeId }, ...context });

  return validateBackendActivatedTheme(data, themeId);
}

export function validateBackendActivatedTheme(data: unknown, themeId: number): ThemeActivateResult {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !('outcome' in data) ||
    typeof data.outcome !== 'string' ||
    (data.outcome !== 'activated' && data.outcome !== 'not_found') ||
    !('id' in data) ||
    (data.id !== null && (typeof data.id !== 'number' || !Number.isFinite(data.id) || !Number.isInteger(data.id) || Number(data.id) <= 0)) ||
    !('name' in data) ||
    (data.name !== null && typeof data.name !== 'string') ||
    (data.outcome === 'activated' && (data.id !== themeId || typeof data.name !== 'string'))
  ) {
    throw new Error('切换主题响应不完整');
  }

  return { outcome: data.outcome, id: data.id, name: data.name };
}
export async function deactivateBackendTheme(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<ThemeDeactivateResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'post_players_id_themes_deactivate', { path: { id: uid }, ...context });

  return validateBackendDeactivatedTheme(data);
}

export function validateBackendDeactivatedTheme(data: unknown): ThemeDeactivateResult {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !('removed' in data) || typeof data.removed !== 'boolean') {
    throw new Error('关闭主题响应不完整');
  }

  return { removed: data.removed };
}
