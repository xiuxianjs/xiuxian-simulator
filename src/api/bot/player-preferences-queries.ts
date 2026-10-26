import type { PlayerPreferencesQueryData } from '../schemas/player-preferences-query';

export function validatePlayerPreferences(data: unknown): PlayerPreferencesQueryData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('玩家设置数据不完整');
  }
  const row = data as Record<string, unknown>;
  const keys = [
    'dungeonBattleMode',
    'teamDungeonNoMental',
    'autoApproveFriendTeam',
    'hideProfile',
    'confirmSpiritCrystal',
    'confirmDaoCrystal',
    'teamInviteEnabled',
    'teamAutoAcceptInvite'
  ];

  if (keys.some(key => !Object.hasOwn(row, key) || row[key] === undefined)) {
    throw new Error('玩家设置字段不完整');
  }

  return {
    meditationAutoBoost: row.meditationAutoBoost === true,
    dungeonBattleMode: row.dungeonBattleMode,
    teamDungeonNoMental: row.teamDungeonNoMental,
    autoApproveFriendTeam: row.autoApproveFriendTeam,
    hideProfile: row.hideProfile,
    confirmSpiritCrystal: row.confirmSpiritCrystal,
    confirmDaoCrystal: row.confirmDaoCrystal,
    teamInviteEnabled: row.teamInviteEnabled,
    teamAutoAcceptInvite: row.teamAutoAcceptInvite
  };
}
