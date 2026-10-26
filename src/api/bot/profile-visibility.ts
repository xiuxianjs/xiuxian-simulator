import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import type { ProfileVisibilityPreference } from '../schemas/profile-visibility';
export async function setBackendProfileVisibility(
  bid: string | undefined,
  uid: number,
  hideProfile: boolean,
  request?: BackendRequestContext
): Promise<ProfileVisibilityPreference> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data: unknown = await requestBackend(bid, 'patch_players_id_preferences_profile_visibility', { path: { id: uid }, body: { hideProfile }, ...context });

  if (!data || typeof data !== 'object' || Array.isArray(data) || (data as Record<string, unknown>).hideProfile !== hideProfile) {
    throw new Error('信息隐藏配置响应不完整');
  }

  return { hideProfile };
}
