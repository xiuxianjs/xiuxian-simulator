import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { FriendRequestPreferenceData } from '../schemas/friend-settings';
export function parseBackendFriendSettings(data: unknown): FriendRequestPreferenceData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('好友设置数据不完整');
  }
  const row = data as Record<string, unknown>;

  if (typeof row.canUseFifthLayerFeature !== 'boolean' || typeof row.isEnabled !== 'boolean' || (row.realmName !== null && typeof row.realmName !== 'string')) {
    throw new Error('好友设置字段不完整');
  }

  return {
    canUseFifthLayerFeature: row.canUseFifthLayerFeature,
    realmName: row.realmName,
    isEnabled: row.isEnabled
  };
}
export async function getBackendFriendSettings(bid: string | undefined, uid: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendFriendSettings(await requestBackend(bid, 'get_players_id_friend_request_preference', { path: { id: uid } }));
}
export async function setBackendFriendSettings(bid: string | undefined, uid: number, enabled: boolean, request?: BackendRequestContext) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const out = parseBackendFriendSettings(
    await requestBackend(bid, 'patch_players_id_friend_request_preference', {
      path: { id: uid },
      body: { friendRequestEnabled: enabled },
      ...context
    })
  );

  if (out.canUseFifthLayerFeature && out.isEnabled !== enabled) {
    throw new Error('好友设置状态不一致');
  }

  return out;
}
