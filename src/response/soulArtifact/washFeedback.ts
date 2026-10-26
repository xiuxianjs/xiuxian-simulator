import { markdownButtonLabel } from '@src/utils/buttonLabel';
import type { GameEvent } from '@src/types/event';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { useMessage } from '@src/utils/useMessage';
import { FormatGui, addOptions } from '@src/utils/messageHelper';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { soulWashRecoveryTips } from '@src/response/soulWashRecovery';
import { Format } from 'alemonjs';

export function soulWashFeedback(event: GameEvent, mode: 'preview' | 'confirm' | 'cancel') {
  return adviceRenderer(async (reply: RobotMiddlewareReply) => {
    const [message] = useMessage(event);
    const md = Format.createMarkdown();

    if (reply.heading) {
      md.addBold(reply.heading).addNewline();
    }
    const text = reply.rawLines?.join('\n') ?? reply.text;
    const blocks = reply.rawLines ? undefined : reply.blocks;

    md.addText(text);
    if (reply.quote) {
      md.addBlockquote(Format.createMarkdown().addText(reply.quote));
    }
    const duplicate =
      blocks?.map(block => block.text).join('') === text ||
      blocks
        ?.filter(block => !block.quoted)
        .map(block => block.text)
        .join('') === text;

    appendMiddlewareBlocks(md, duplicate ? blocks?.filter(block => block.quoted || block.inlineButtons?.length) : blocks);
    if (mode === 'confirm') {
      md.addBlockquote(Format.createMarkdown().addText('查看面板： ').addButton(markdownButtonLabel('本命物信息'), { data: '/本命物信息' }));
    }
    if (mode === 'cancel') {
      md.addText(' ').addButton(markdownButtonLabel('本命物信息'), { data: '/本命物信息' });
    }
    const advice = [...reply.advice];

    for (const tip of soulWashRecoveryTips(text)) {
      if (!advice.some(existing => existing.command === tip.command)) {
        advice.push({ command: tip.command, description: `${tip.label}：${tip.description}` });
      }
    }
    appendMiddlewareAdvice(md, advice);
    if (reply.buttons.length) {
      addOptions(md, reply.buttons);
    }
    await message.send(FormatGui({ bid: event.UserId, isPrivate: event.isPrivate ?? event.name.startsWith('private.'), title: '', content: md }));
  });
}
