import { Format } from 'alemonjs';
import type { OnboardingView } from '@src/api/bot/onboarding';

const protectedCommand = (command: string) => /^\/主线扫荡\s/.test(command) || /^\/服用 精力丹 [1-9]\d*$/.test(command) || ['/突破', '/出关', '/闭关'].includes(command);

export const hasBoundReturnChoices = (view: OnboardingView): boolean => view.status === 'completed' && view.choiceBound === true && view.actions.some(button => protectedCommand(button.command));

export function onboardingKeyboard(buttons: { label: string; command: string }[][]) {
  const group = Format.createButtonGroup();

  buttons.flat().forEach(button => {
    group.addRow().addButton(button.label, button.command, {
      type: 'command',
      autoEnter: false
    });
  });

  return group;
}
