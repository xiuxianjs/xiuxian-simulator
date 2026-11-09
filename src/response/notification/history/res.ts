import { createBackendRequestContext } from '@src/api/bot/context';
import { parseNotificationHistory } from '@src/api/bot/notification-history-queries';
import { requestRobotBusiness } from '@src/api/bot/robot-business';
import { fishingBossNoticeCommand, fishingNotificationLayout, notificationTextLayout } from '@src/notification/presentation';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { commandText } from '@src/utils/commandPrefix';
import { flyMailNoticeQuote, flyMailViewCommand, parseFlyMailNotice } from '@src/utils/flyMailPresentation';
import { formatGameTime } from '@src/utils/gameTime';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { useMessage } from '@src/utils/useMessage';
import { Format, logger, onResponse, ResultCode, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const md = Format.createMarkdown();
  const [, parentNext] = useEvent();
  const match = (e.MessageText ?? '').trim().match(/^[!！/#＃]?(?:我的通知|通知记录)(?:\s+(\d+))?$/);

  if (!match) {
    return parentNext();
  }
  const page = Number(match[1] ?? 1);
  let nav: Parameters<typeof FormatGui>[0]['nav'];
  const displayedIds: string[] = [];

  try {
    const response = await runRobotBusiness(
      e,
      'notifications.history',
      { pageText: match[1] ?? '' },
      data => parseNotificationHistory(data, page),
      parentNext,
      async reply => {
        md.addText(reply.text);
        await message.send(FormatGui({ isPrivate: isPrivateEvent(e), bid: e.UserId, title: reply.title, content: md }));
      }
    );

    if (response.handled) {
      return;
    }
    const result = response.data;

    nav = { current: result.page, total: result.totalPages, hasNext: result.hasNext, command: '/我的通知 {page}', autoEnter: false };

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
        const quote = flyMailNoticeQuote(mail, e.uid);

        quote.addText(' ').addButton(markdownButtonLabel('查看飞信'), { data: commandText(flyMailViewCommand(mail.scope, mail.conversationId)) });
        md.addBlockquote(quote);
        continue;
      }
      if (item.id.startsWith('flymail.')) {
        md.addBlockquote(createQuoteMarkdown(['你有飞信记录，请查看飞信。'], [{ label: '查看飞信', command: '/飞信' }]));
        continue;
      }
      const fishingCastId = item.fishingCastId ?? /^fishing\.result:(fc_[0-9a-f]{32}):[1-9]\d*$/.exec(item.id)?.[1];
      const fishing = fishingCastId === undefined ? undefined : fishingNotificationLayout(item.text, fishingCastId);
      const { title, lines } = fishing ?? notificationTextLayout(item.text);
      const quote = createQuoteMarkdown([`【${index + 1}】${title}`, `时间：${formatGameTime(item.time)}`, '', ...lines]);

      if (fishing?.reportCommand) {
        quote.addNewline().addButton(markdownButtonLabel('查看战报'), { data: commandText(fishing.reportCommand), autoEnter: false });
      }
      const encounterCommand = fishingBossNoticeCommand(item.fishingBossEventId);

      if (encounterCommand) {
        quote.addNewline().addButton(markdownButtonLabel('查看奇遇'), { data: commandText(encounterCommand), autoEnter: false });
      }
      md.addBlockquote(quote).addNewline();
      if (item.text !== '通知内容暂不可用' && !item.text.includes('〔非文本')) {
        displayedIds.push(item.id);
      }
    }
  } catch (error) {
    displayedIds.length = 0;
    logger.error('通知记录查询失败', error);
    md.addText('通知记录暂时无法加载，请稍后再试。');
  }
  const receipts = await message.send(
    FormatGui({
      isPrivate: isPrivateEvent(e),
      bid: e.UserId,
      title: '我的通知',
      content: md,
      nav
    })
  );

  if (displayedIds.length && receipts.length && receipts.every(receipt => receipt.code === ResultCode.Ok)) {
    try {
      const receipt = await requestRobotBusiness(
        e,
        'notifications.history-delivered',
        { eventIds: displayedIds },
        data => data,
        createBackendRequestContext(e, 'notifications.history-delivered')
      );

      if (!receipt.success || receipt.branch !== 'business') {
        logger.warn('通知历史送达回执未确认');
      }
    } catch (error) {
      logger.error('通知历史送达回执失败', error);
    }
  }
});
