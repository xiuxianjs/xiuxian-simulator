import { type EnumPreferenceAction } from '@src/api/bot/enum-preferences';
import { logger, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { validateRobotPreference } from '@src/api/bot/settings-robot-query';
type Result = { code: 'OK'; data: EnumPreferenceAction } | { code: 'SET_FAILED' };
export default async function App(params: { event: GameEvent; next: Next; action: EnumPreferenceAction }): Promise<Result | undefined> {
  try {
    const action = params.action;
    const dungeon = action.type === 'DUNGEON_BATTLE_MODE';
    const value = action.type === 'DUNGEON_BATTLE_MODE' ? action.mode : action.rule;
    const response = await runRobotBusiness(
      params.event,
      dungeon ? 'settings.dungeon-battle-mode' : 'settings.team-auto-accept-invite',
      { value },
      data => validateRobotPreference(data, dungeon ? 'dungeonBattleMode' : 'teamAutoAcceptInvite', value, action),
      params.next
    );

    return response.handled ? undefined : { code: 'OK', data: response.data };
  } catch (error) {
    logger.error(error);

    return { code: 'SET_FAILED' };
  }
}
