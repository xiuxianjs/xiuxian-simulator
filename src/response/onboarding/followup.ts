import { Format, markdownToPlainText, type FormatMarkDown } from 'alemonjs';
import type { RobotBusinessFollowup } from '@src/api/bot/robot-business';
import type { GameEvent } from '@src/types/event';
import { FormatGui } from '@src/utils/messageHelper';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { listenOnboarding, sendTeachingMessage } from './context';
import { onboardingDisplayLines, onboardingFooter } from './policy';
import { hasBoundReturnChoices, onboardingKeyboard } from './keyboard';

// Optional guidance travels with the committed business response. This renderer
// cannot request or settle gameplay. Active milestone views attach their
// existing Context; completed return views stay outside the teaching Context.
export async function sendOnboardingFollowup(event: GameEvent, followup: RobotBusinessFollowup, title: string, receipt: FormatMarkDown): Promise<boolean> {
  const view = followup.onboarding;

  if (!view && !followup.onboardingPending) {
    return false;
  }
  const pending = followup.onboardingPending === true || !view;
  const lines = pending
    ? ['本次操作的结算回执见上方。', '下一步指引暂时无法读取。', '可核对当前进度。']
    : [...view.feedback.flatMap(line => line.split('\n')), ...onboardingDisplayLines(view)];
  const buttons = pending
    ? [[{ label: '核对当前进度 · /继续引导', command: '/继续引导' }], [{ label: '任务面板 · /任务面板', command: '/任务面板' }]]
    : onboardingFooter(view);
  const md = Format.createMarkdown().addBlockquote(receipt).addNewline();

  for (const line of lines) {
    md.addText(line).addNewline();
  }
  const active = !pending && (view.status === 'active' || view.status === 'soft');

  if (active) {
    listenOnboarding(view);
  }
  const native = !pending && event.Platform === 'qq-bot' && (active || hasBoundReturnChoices(view));
  const bubble = FormatGui({ isPrivate: isPrivateEvent(event), bid: event.UserId, title, content: md, footer: native ? undefined : buttons, bar: false });

  if (native) {
    bubble.format.addButtonGroup(onboardingKeyboard(event.UserId, isPrivateEvent(event), buttons));
  }
  await sendTeachingMessage(event, bubble, [
    title,
    markdownToPlainText(receipt.value.value),
    ...lines,
    '可选指令：',
    ...buttons.flat().map(button => button.label)
  ]);

  return true;
}
