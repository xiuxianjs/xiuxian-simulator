import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { useMessage } from '@src/utils/useMessage';
import { formatFeedbackInfo, parseFeedbackId } from '@src/api/bot/feedback-robot';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendFeedbackDetail } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

/**
 * 查看反馈功能
 * 根据反馈ID查询反馈详细信息
 * 指令格式：/查看反馈 [反馈信息id]
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

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
    await message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: '查看反馈', content }));
  };

  try {
    // 解析命令参数
    const messageText = e.MessageText;
    const feedbackId = parseFeedbackId(messageText);

    const loaded = await runRobotBusiness(
      e,
      'feedback.detail',
      { feedbackId },
      value => parseBackendFeedbackDetail(value, feedbackId ?? 0),
      next,
      renderFailure
    );

    if (loaded.handled) {
      return;
    }
    const feedback = loaded.data;

    // 格式化并发送反馈详情
    const formattedMessage = formatFeedbackInfo(feedback);
    const md = Format.createMarkdown();

    md.addText(formattedMessage);

    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '查看反馈',
        content: md,
        footer: [
          { label: '我的反馈', command: '/我的反馈' },
          { label: '提交反馈', command: '/提交反馈' }
        ]
      })
    );
  } catch (error) {
    logger.error('查看反馈失败:', error);
    const md = Format.createMarkdown();

    md.addText('反馈信息\\反馈id 不存在');

    void message.send(FormatGui({ isPrivate, bid, title: '查看反馈', content: md }));
  }
});
