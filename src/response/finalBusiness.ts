import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { Format, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import type { RobotBusinessOperation } from '@src/api/bot/robot-business';
import type { RobotBusinessFollowup } from '@src/api/bot/robot-business';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { SHOP_META } from './shop/meta';
import { runRobotBusiness } from './robotBusiness';
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from './middlewareReply';
import { adviceRenderer } from './feedbackRenderer';

// Controlled refusals use the original entry's bubble. Only middleware results
// advance to parent next; load reads the single captured business response.
export async function loadFinalBusiness<T>(
  event: GameEvent,
  next: Next,
  operation: RobotBusinessOperation,
  args: Record<string, unknown>,
  decode: (value: unknown) => T
): Promise<{ handled: true } | ({ handled: false; load: () => Promise<T> } & RobotBusinessFollowup)> {
  try {
    const result = await runRobotBusiness(
      event,
      operation,
      args,
      decode,
      next,
      adviceRenderer(reply => renderFinalRefusal(event, operation, reply))
    );

    if (result.handled) {
      return result;
    }

    return {
      handled: false,
      load: () => Promise.resolve(result.data),
      ...(result.onboarding ? { onboarding: result.onboarding } : {}),
      ...(result.onboardingPending ? { onboardingPending: true } : {})
    };
  } catch (error) {
    // Retain the original App's transport/error presentation, with no retry.
    return { handled: false, load: () => Promise.reject(error) };
  }
}

async function renderFinalRefusal(event: GameEvent, operation: RobotBusinessOperation, reply: RobotMiddlewareReply): Promise<void> {
  const [message] = useMessage(event);
  const md = Format.createMarkdown();
  let footer = reply.buttons.length ? reply.buttons : undefined;
  let title = reply.title;

  if (['items.consume', 'soul-artifacts.refine', 'peiyuan.confirm', 'mingwu.confirm'].includes(operation) && reply.heading) {
    md.addBold(reply.heading).addNewline();
  }

  if (operation === 'tribulation.command' || operation === 'tribulation.public') {
    md.addBlockquote(createQuoteMarkdown(reply.text.split('\n'), reply.buttons));
    footer = undefined;
  } else if (operation === 'realm.promotion') {
    md.addText('晋级失败').addNewline().addText(reply.text).addNewline();
    if (reply.quote) {
      md.addBlockquote(createQuoteMarkdown(reply.quote.split('\n'))).addNewline();
    }
    for (const block of reply.blocks ?? []) {
      if (block.text === reply.text) {
        continue;
      }
      md.addNewline();
      for (const line of block.text.split('\n')) {
        md.addText(line).addNewline();
      }
    }
  } else if (operation === 'meditation.start' && reply.quote) {
    const inline = reply.buttons[0];

    md.addBlockquote(Format.createMarkdown().addText(reply.quote).addButton(markdownButtonLabel(inline.label), { data: inline.command }));
    footer = reply.buttons.slice(1);
  } else {
    md.addText(reply.text);
    if (
      operation === 'lootboxes.open' ||
      operation === 'items.detail' ||
      operation === 'items.consume' ||
      operation === 'soul-artifacts.refine' ||
      operation === 'peiyuan.confirm' ||
      operation === 'mingwu.confirm'
    ) {
      if (reply.quote) {
        md.addNewline().addBlockquote(createQuoteMarkdown(reply.quote.split('\n')));
      }
      appendMiddlewareBlocks(
        md,
        reply.blocks?.filter(block => block.text !== reply.text || block.inlineButtons?.length)
      );
    }
    if (operation === 'items.consume' || operation === 'soul-artifacts.refine') {
      md.addNewline();
    }
    if (operation === 'shops.purchase') {
      title = SHOP_META[reply.heading]?.name ?? '商店';
    }
  }
  appendMiddlewareAdvice(md, reply.advice);
  await message.send(FormatGui({ isPrivate: event.isPrivate ?? event.name.startsWith('private.'), bid: event.UserId, title, content: md, footer }));
}
