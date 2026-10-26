import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import type { GameEvent } from '@src/types/event';
import { FormatGui } from '@src/utils/messageHelper';
import { Format } from 'alemonjs';

export function glossaryFeedbackMessage(event: GameEvent, reply: RobotMiddlewareReply) {
  const content = Format.createMarkdown();
  const lines = reply.blocks?.map(block => block.text) ?? [reply.text];

  for (const [index, line] of lines.entries()) {
    if (index) {
      content.addNewline();
    }
    content.addText(line);
  }

  return FormatGui({
    isPrivate: event.isPrivate ?? false,
    bid: event.UserId,
    title: reply.title || '词典',
    content,
    footer: reply.buttons.map(button => ({ label: button.label, command: button.command }))
  });
}
