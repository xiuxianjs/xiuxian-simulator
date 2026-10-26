import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
export type EnumPreferenceAction =
  { type: 'DUNGEON_BATTLE_MODE'; mode: 'auto' | 'manual' } | { type: 'TEAM_AUTO_ACCEPT_INVITE'; rule: 'none' | 'all' | 'friend' | 'companion' };
export async function setBackendEnumPreference(bid: string | undefined, uid: number, action: EnumPreferenceAction, request?: BackendRequestContext) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  if (action.type === 'DUNGEON_BATTLE_MODE') {
    if (action.mode !== 'auto' && action.mode !== 'manual') {
      throw new Error('秘境战斗模式参数无效');
    }
  } else if (action.type === 'TEAM_AUTO_ACCEPT_INVITE') {
    if (!['none', 'all', 'friend', 'companion'].includes(action.rule)) {
      throw new Error('队伍邀请规则参数无效');
    }
  } else {
    throw new Error('不支持的偏好设置');
  }
  const context = writeContext(request);
  let data: unknown;
  let field: string;
  let expected: string;

  if (action.type === 'DUNGEON_BATTLE_MODE') {
    field = 'dungeonBattleMode';
    expected = action.mode;
    data = await requestBackend(bid, 'patch_players_id_preferences_dungeon_battle_mode', {
      path: { id: uid },
      body: { dungeonBattleMode: action.mode },
      ...context
    });
  } else {
    field = 'teamAutoAcceptInvite';
    expected = action.rule;
    data = await requestBackend(bid, 'patch_players_id_preferences_team_auto_accept_invite', {
      path: { id: uid },
      body: { teamAutoAcceptInvite: action.rule },
      ...context
    });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) || (data as Record<string, unknown>)[field] !== expected) {
    throw new Error('偏好设置响应不完整');
  }

  return action;
}
