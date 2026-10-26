import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { formatGameTime } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { parsePageNumber } from '@src/api/bot/feedback-robot';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendFeedbacks } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
/**
 * 我的反馈功能
 * 支持分页查询用户的反馈记录
 * 指令格式：/我的反馈 [页数]
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;

  const [, next] = useEvent();
  const renderFailure = async (reply: { text: string; buttons: { label: string; command: string }[] }) => {
    const content = Format.createMarkdown().addText(reply.text);

    for (const button of reply.buttons) {
      content.addText(' ');
      content.addButton(markdownButtonLabel(button.label), { data: button.command });
    }
    if (reply.buttons.length) {
      content.addNewline();
    }
    await message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: '我的反馈', content }));
  };

  try {
    const messageText = e.MessageText;
    const page = parsePageNumber(messageText);
    const loaded = await runRobotBusiness(e, 'feedback.mine', { page }, parseBackendFeedbacks, next, renderFailure);

    if (loaded.handled) {
      return;
    }
    const result = loaded.data;

    if (result.total === 0) {
      const emptyMd = Format.createMarkdown();

      emptyMd.addText('您还没有提交过任何反馈。');

      void message.send(
        FormatGui({
          isPrivate: e.isPrivate ?? false,
          bid,
          title: '我的反馈',
          content: emptyMd,
          footer: [{ label: '提交反馈', command: '/提交反馈' }]
        })
      );

      return;
    }

    const contentMd = Format.createMarkdown();

    result.feedbacks.forEach(feedback => {
      const status = feedback.isReplied ? '已回复' : '未回复';
      const content = feedback.content.length > 20 ? feedback.content.substring(0, 20) + '...' : feedback.content;
      const feedbackTime = formatGameTime(feedback.feedbackTime);

      contentMd.addBlockquote(
        createQuoteMarkdown([`【${feedback.id}】【${status}】`, content, feedbackTime], [{ label: '查看', command: `/查看反馈 ${feedback?.id ?? 0}` }])
      );
    });

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '我的反馈',
        content: contentMd,
        nav: {
          current: result.currentPage,
          total: result.totalPages,
          command: '/我的反馈 {page}'
        },
        header: [{ label: '提交反馈', command: '/提交反馈' }]
      })
    );
  } catch (error) {
    logger.error('查询我的反馈失败:', error);

    const errMd = Format.createMarkdown();

    errMd.addText('查询反馈记录失败，请稍后再试。');

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '我的反馈',
        content: errMd
      })
    );
  }
});
