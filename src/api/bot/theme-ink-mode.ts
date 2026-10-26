import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { ThemeInkModeData } from '../schemas/theme-ink-mode';
export async function switchBackendInkMode(
  bid: string | undefined,
  uid: number,
  mode: 'ink' | 'dark',
  request?: BackendRequestContext
): Promise<ThemeInkModeData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'post_players_id_themes_ink_mode', { path: { id: uid }, body: { mode }, ...context });

  return validateBackendInkMode(data, mode);
}

export function validateBackendInkMode(data: unknown, mode: 'ink' | 'dark'): ThemeInkModeData {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !('code' in data) ||
    typeof data.code !== 'string' ||
    (data.code !== 'OK' && data.code !== 'NO_ACTIVE_THEME') ||
    !('mode' in data) ||
    data.mode !== mode
  ) {
    throw new Error('墨色模式响应不完整');
  }

  return { code: data.code, mode };
}
