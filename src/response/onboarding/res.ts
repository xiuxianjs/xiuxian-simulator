import { onResponse, useEvent, type Next } from 'alemonjs';
import { selects } from '../config';
import { runRobotBusiness } from '../robotBusiness';
import { parseOnboarding } from '@src/api/bot/onboarding';
import { showOnboarding, showOnboardingRecovery } from './context';
import { canonicalOnboardingCommand, onboardingButtonVersion } from './policy';

import type { GameEvent } from '@src/types/event';

export async function handleOnboardingResponse(event: GameEvent, next: Next): Promise<void> {
  if (/^[!！]/.test((event.MessageText ?? '').trimStart())) {
    next();

    return;
  }
  const command = canonicalOnboardingCommand(event.MessageText ?? '');
  const buttonVersion = onboardingButtonVersion(event);
  const control = command === '继续引导' || command === '退出引导';

  if (!control && buttonVersion === undefined) {
    next();

    return;
  }

  try {
    const action = !control && typeof buttonVersion === 'number';
    const result = await runRobotBusiness(
      event,
      command === '退出引导' ? 'onboarding.exit' : action ? 'onboarding.action' : 'onboarding.view',
      action ? { version: buttonVersion, command: event.MessageText?.trim() } : {},
      parseOnboarding,
      next
    );

    if (!result.handled) {
      if (action) {
        result.data.feedback.unshift(`你选择了：${event.MessageText?.trim()}`);
      }
      await showOnboarding(event, result.data);
    }
  } catch (error) {
    await showOnboardingRecovery(event, error);
  }
}

export default onResponse(selects, async event => {
  const [, next] = useEvent();

  await handleOnboardingResponse(event, next);
});
