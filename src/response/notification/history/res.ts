import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { notificationTextLayout } from '@src/notification/presentation';
import { flyMailQuote, flyMailViewCommand, parseFlyMailNotice } from '@src/utils/flyMailPresentation';
import { formatGameTime } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseNotificationHistory } from '@src/api/bot/notification-history-queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const md = Format.createMarkdown();
  const [, parentNext] = useEvent();
  const match = (e.MessageText ?? '').trim().match(/^[!！/#＃]?(?:我的通知|通知记录)(?:\s+(\d+))?$/);

  if (!match) {
    return parentNext();
  }
  const page = Number(match[1] ?? 1);
  const footer = [{ label: '返回主页', command: '/我' }];
  let hasNext = false;

  try {
    const response = await runRobotBusiness(
      e,
      'notifications.history',
      { pageText: match[1] ?? '' },
      data => parseNotificationHistory(data, page),
      parentNext,
      async reply => {
        md.addText(reply.text);
        await message.send(FormatGui({ isPrivate: isPrivateEvent(e), bid: e.UserId, title: reply.title, content: md, footer }));
      }
    );

    if (response.handled) {
      return;
    }
    const result = response.data;

    hasNext = result.hasNext;

    if (result.items.length === 0) {
      md.addText('本页暂无通知');
    }
    for (const [index, item] of result.items.entries()) {
      if (item.id.startsWith('flymail.subscription.required:')) {
        md.addBlockquote(createQuoteMarkdown(['旧飞信转发提醒已停用，飞信仅向实际收件人私聊投递。']));
        continue;
      }
      if (!isPrivateEvent(e) && (item.flymail || item.id.startsWith('flymail.'))) {
        md.addBlockquote(createQuoteMarkdown(['你有飞信记录，请私聊机器人发送 /飞信 查看。']));
        continue;
      }
      const mail = parseFlyMailNotice(item.flymail);

      if (mail) {
        const quote = flyMailQuote(mail, e.uid);

        quote.addText(' ').addButton(markdownButtonLabel('查看飞信'), { data: flyMailViewCommand(mail.scope, mail.conversationId) });
        md.addBlockquote(quote);
        continue;
      }
      const { title, lines } = notificationTextLayout(item.text);
      const quote = createQuoteMarkdown([`【${index + 1}】${title}`, `时间：${formatGameTime(item.time)}`, '', ...lines]);

      md.addBlockquote(quote).addNewline();
    }
  } catch (error) {
    logger.error('通知记录查询失败', error);
    md.addText('通知记录暂时无法加载，请稍后再试。');
  }
  await message.send(
    FormatGui({
      isPrivate: isPrivateEvent(e),
      bid: e.UserId,
      title: '我的通知',
      content: md,
      footer,
      nav: { current: page, hasNext, command: '/我的通知 {page}' }
    })
  );
});
