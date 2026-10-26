import { type ConfirmationPreferenceAction } from '@src/api/bot/confirmation-preferences';
import type { CodeResult } from '@src/types/result';
import { logger, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { validateRobotPreference } from '@src/api/bot/settings-robot-query';
export type MessageConfigUpdateAction = ConfirmationPreferenceAction;
export type MessageConfigUpdateResult = CodeResult<'OK', 'SET_FAILED', MessageConfigUpdateAction>;
export default async function App(params: { event: GameEvent; next: Next; action: MessageConfigUpdateAction }): Promise<MessageConfigUpdateResult | undefined> {
  try {
    const action = params.action;
    const spirit = action.type === 'CONFIRM_SPIRIT_CRYSTAL';
    const value = Number.isFinite(action.threshold) ? action.threshold : null;
    const response = await runRobotBusiness(
      params.event,
      spirit ? 'settings.spirit-crystal-confirmation' : 'settings.dao-crystal-confirmation',
      { value },
      data => validateRobotPreference(data, spirit ? 'confirmSpiritCrystal' : 'confirmDaoCrystal', value, action),
      params.next
    );

    return response.handled ? undefined : { code: 'OK', data: response.data };
  } catch (error) {
    logger.error(error);

    return { code: 'SET_FAILED' };
  }
}
