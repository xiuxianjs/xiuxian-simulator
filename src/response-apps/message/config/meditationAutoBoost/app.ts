import type { Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { validateRobotPreference } from '@src/api/bot/settings-robot-query';

export default function App(event: GameEvent, next: Next, enabled: boolean) {
  return runRobotBusiness(
    event,
    'settings.meditation-auto-boost',
    { value: enabled },
    data => validateRobotPreference(data, 'meditationAutoBoost', enabled, enabled),
    next
  );
}
