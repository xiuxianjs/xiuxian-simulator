import { markdownButtonLabel } from '@src/utils/buttonLabel';
import type { GameEvent } from '@src/types/event';
import type { RobotMiddlewareResult } from '@src/api/bot/middleware-entry';
import type { GuiButton } from '@src/utils/messageHelper';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { Format } from 'alemonjs';
import { sendMiddlewareReply } from './middlewareReply';
import { startOnboardingAfterPrologue, showOnboardingRecovery } from './onboarding/context';

const GUIDE_ACTION_BAR: GuiButton[] = [
  { label: '继续', command: '/继续' },
  { label: '跳过剧情', command: '/跳过引导' }
];

// Guide progress, skip/continue and rewards have already completed in the API.
// Keep the former local presentation without repeating any guide request.
export default async (event: GameEvent, result: RobotMiddlewareResult): Promise<boolean> => {
  const action = result.guide;

  if (result.reason !== 'GUIDE' || !action || action.action === 'cleared') {
    return true;
  }
  // The service appends the guide presentation after any maintenance pre-notice.
  for (const reply of result.replies.slice(0, -1)) {
    await sendMiddlewareReply(event, reply);
  }
  const presentation = action.presentation;

  if (action.action === 'completed' || action.action === 'skipped') {
    try {
      if (await startOnboardingAfterPrologue(event, presentation.text)) {
        return false;
      }
    } catch (error) {
      // The old award is already committed. Preserve its receipt and show a
      // narrow recovery entry instead of silently falling back to six menus.
      await showOnboardingRecovery(event, error, presentation.text);

      return false;
    }
  }
  const [message] = useMessage(event);
  const md = Format.createMarkdown();

  if (presentation.heading) {
    md.addBold(presentation.heading);
    md.addNewline();
  }
  md.addText(presentation.text);
  for (const [index, advice] of presentation.advice.entries()) {
    if (index === 0) {
      md.addNewline();
    }
    md.addButton(markdownButtonLabel(advice.command), { data: advice.command });
    md.addText(`：${advice.description}`);
    md.addNewline();
  }
  await message.send(
    FormatGui({
      isPrivate: event.isPrivate ?? event.name.startsWith('private.'),
      bid: event.UserId,
      title: presentation.title,
      content: md,
      bar: presentation.showActionBar ? GUIDE_ACTION_BAR : false
    })
  );

  return false;
};
