import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { PlayerProfileActionResult } from '../schemas/player-profile-action';

export type PlayerProfileAction = 'rename' | 'gender' | 'signature';

export async function executeBackendPlayerProfileAction(
  bid: string | undefined,
  uid: number,
  action: PlayerProfileAction,
  value: string,
  request?: BackendRequestContext
): Promise<PlayerProfileActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'post_players_id_profile_actions', {
    headers: repeatPresentationHeaders(action === 'rename' ? '改名' : action === 'gender' ? '改性' : '改签名'),
    path: { id: uid },
    body: { action, value },
    ...context
  });

  return validateBackendPlayerProfileAction(data, action);
}

export function validateBackendPlayerProfileAction(data: unknown, action: PlayerProfileAction): PlayerProfileActionResult {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !('action' in data) ||
    data.action !== action ||
    !('value' in data) ||
    typeof data.value !== 'string' ||
    !('cleared' in data) ||
    typeof data.cleared !== 'boolean'
  ) {
    throw new Error('角色资料动作响应不完整');
  }

  return { action, value: data.value, cleared: data.cleared };
}
