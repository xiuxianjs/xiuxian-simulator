import { Format } from 'alemonjs';
import type { OnboardingView } from '@src/api/bot/onboarding';
import { onboardingButtonId } from './policy';

const protectedCommand = (command: string) => /^\/主线扫荡\s/.test(command) || /^\/服用 精力丹 [1-9]\d*$/.test(command) || ['/突破', '/出关', '/闭关'].includes(command);

export const hasBoundReturnChoices = (view: OnboardingView): boolean => view.status === 'completed' && view.choiceBound === true && view.actions.some(button => protectedCommand(button.command));

export function onboardingKeyboard(userId: string, view: OnboardingView, buttons: { label: string; command: string }[][]) {
  const group = Format.createButtonGroup();

  buttons.flat().forEach((button, index) => {
    const bound = view.status !== 'completed' || protectedCommand(button.command);

    group.addRow().addButton(button.label, button.command, {
      type: bound ? 'call' : 'command',
      ...(!bound ? { autoEnter: true } : {}),
      rawData: bound ? { id: onboardingButtonId(view.version, index) } : {},
      toolTip: '当前客户端不支持此按钮，可手动发送按钮旁的指令。',
      permission: { type: 0, userIds: [userId] }
    });
  });

  return group;
}
