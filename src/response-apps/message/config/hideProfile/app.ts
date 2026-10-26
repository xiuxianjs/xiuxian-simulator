type HideProfileResult = { code: 'OK'; data: { type: 'HIDE_PROFILE'; enabled: boolean } } | { code: 'SET_FAILED' };
import { logger, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { validateRobotPreference } from '@src/api/bot/settings-robot-query';
export default async function App(params: {
  event: GameEvent;
  next: Next;
  action: { type: 'HIDE_PROFILE'; enabled: boolean };
}): Promise<HideProfileResult | undefined> {
  try {
    const action = params.action;
    const response = await runRobotBusiness(
      params.event,
      'settings.hide-profile',
      { value: action.enabled },
      data => validateRobotPreference(data, 'hideProfile', action.enabled, action),
      params.next
    );

    return response.handled ? undefined : { code: 'OK', data: response.data };
  } catch (error) {
    logger.error(error);

    return { code: 'SET_FAILED' };
  }
}
