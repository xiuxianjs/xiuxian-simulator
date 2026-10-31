import type { GameEvent } from '@src/types/event';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { addOptions, createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { Format, type FormatMarkDown } from 'alemonjs';
import { activeFeatureText, mentionsRetiredFeature } from './retiredFeatures';
import { appendTreasureEffects } from './treasureEffects';

export function presentMiddlewareReply(reply: RobotMiddlewareReply): RobotMiddlewareReply {
  return {
    ...reply,
    title: activeFeatureText(reply.title),
    heading: activeFeatureText(reply.heading),
    text: activeFeatureText(reply.text),
    ...(reply.quote === undefined ? {} : { quote: activeFeatureText(reply.quote) }),
    ...(reply.rawLines === undefined ? {} : { rawLines: reply.rawLines.map(activeFeatureText).filter(Boolean) }),
    ...(reply.blocks === undefined
      ? {}
      : {
          blocks: reply.blocks
            .map(block => ({
              ...block,
              text: activeFeatureText(block.text),
              ...(block.inlineButtons === undefined
                ? {}
                : { inlineButtons: block.inlineButtons.filter(button => !mentionsRetiredFeature(button.command) && !mentionsRetiredFeature(button.label)) })
            }))
            .filter(block => block.text)
        }),
    buttons: reply.buttons.filter(button => !mentionsRetiredFeature(button.command) && !mentionsRetiredFeature(button.label)),
    advice: reply.advice.filter(item => !mentionsRetiredFeature(item.command) && !mentionsRetiredFeature(item.description))
  };
}

export function appendMiddlewareAdvice(md: FormatMarkDown, advice: RobotMiddlewareReply['advice'] = [], autoEnter?: boolean): void {
  for (const tip of advice) {
    // 恢复建议可能包含费用、资格或结果未知的边界，保留原文，只收起重复的教程标题。
    md.addNewline().addBlockquote(createQuoteMarkdown([tip.description], [{ label: tip.command.replace(/^\//, ''), command: tip.command, autoEnter }]));
  }
}

export function appendMiddlewareBlocks(md: FormatMarkDown, blocks: RobotMiddlewareReply['blocks'] = []): void {
  for (const block of blocks) {
    if (block.quoted) {
      md.addBlockquote(createQuoteMarkdown(block.text.split('\n'), block.inlineButtons ?? []));
    } else {
      md.addText(block.text);
      if (block.inlineButtons?.length) {
        addOptions(md, block.inlineButtons ?? []);
      } else {
        md.addNewline();
      }
    }
  }
}

// Footer mode keeps receipt actions alongside the existing global navigation.
export async function sendMiddlewareReply(event: GameEvent, reply: RobotMiddlewareReply, useDefaultBar: boolean | 'footer' = false): Promise<void> {
  reply = presentMiddlewareReply(reply);
  const [message] = useMessage(event);
  const md = Format.createMarkdown();

  if (reply.rawLines) {
    reply.rawLines.forEach((line, index) => {
      if (index > 0) {
        md.addNewline();
      }
      md.addText(line);
    });
    appendTreasureEffects(md, reply.treasureEffects);
    await message.send({ format: Format.create().addMarkdown(md) });

    return;
  }

  if (reply.heading) {
    md.addBold(reply.heading);
    md.addNewline();
  }
  // Some legacy feedback supplies the same content as both text and blocks.
  if (
    !reply.blocks?.length ||
    (reply.blocks.map(block => block.text).join('') !== reply.text &&
      reply.blocks
        .filter(block => !block.quoted)
        .map(block => block.text)
        .join('') !== reply.text)
  ) {
    md.addText(reply.text);
  }
  if (reply.quote) {
    md.addNewline().addBlockquote(Format.createMarkdown().addText(reply.quote));
  }
  appendMiddlewareBlocks(md, reply.blocks);
  appendTreasureEffects(md, reply.treasureEffects);
  appendMiddlewareAdvice(md, reply.advice);
  // Legacy servers also send page actions as buttons. Standard nav renders
  // those actions itself; retain only the module actions in the footer.
  const pageCommands = reply.nav
    ? new Set([reply.nav.command.replace('{page}', String(reply.nav.current - 1)), reply.nav.command.replace('{page}', String(reply.nav.current + 1))])
    : new Set<string>();
  const footer = reply.buttons.filter(button => !pageCommands.has(button.command));

  await message.send(
    FormatGui({
      isPrivate: event.isPrivate ?? event.name.startsWith('private.'),
      bid: event.UserId,
      title: reply.title,
      content: md,
      nav: reply.nav,
      ...(useDefaultBar === 'footer'
        ? { footer: footer.length ? footer : undefined }
        : { bar: reply.buttons.length ? reply.buttons : useDefaultBar ? undefined : false })
    })
  );
}
