import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { useMessage } from '@src/utils/useMessage';
import { parseCommand, parseRobotFeedbackCompose } from '@src/api/bot/feedback-robot';
import { runRobotBusiness } from '@src/response/robotBusiness';

import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

/**
 * 提交反馈功能
 * 支持分类编号参数的反馈系统
 * 指令格式：/提交反馈 [分类编号] [反馈内容]
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
    await message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: '提交反馈', content }));
  };

  try {
    // 解析命令参数
    const messageText = e.MessageText;
    const commandArgs = parseCommand(messageText);

    const mode = !commandArgs.categoryId ? (commandArgs.content ? 'choose' : 'menu') : commandArgs.content ? 'submit' : 'selected';
    const loaded = await runRobotBusiness(
      e,
      'feedback.compose',
      { mode, categoryId: commandArgs.categoryId, content: commandArgs.content ?? '' },
      parseRobotFeedbackCompose,
      next,
      renderFailure
    );

    if (loaded.handled) {
      return;
    }
    // 3. 根据参数情况处理不同逻辑
    if (!commandArgs.categoryId && !commandArgs.content) {
      // 情况3：只有命令，显示分类列表（按钮化交互）
      const categories = loaded.data.categories;
      const md = Format.createMarkdown();

      if (categories.length === 0) {
        md.addText('暂无可用的反馈分类，请联系运营。');

        void message.send(FormatGui({ isPrivate, bid, title: '提交反馈', content: md }));

        return;
      }

      md.addText('请选择反馈分类，点击后输入具体内容发送：');
      md.addNewline();

      {
        for (const cat of categories) {
          md.addButton(markdownButtonLabel(`${cat.id}、${cat.name}`), { data: `/提交反馈 ${cat.id} ` });
          md.addNewline();
        }

        md.addNewline();
        void message.send(
          FormatGui({
            isPrivate,
            bid,
            title: '提交反馈',
            content: md,
            footer: [{ label: '我的反馈', command: '/我的反馈' }]
          })
        );
      }

      return;
    }

    if (commandArgs.categoryId && !commandArgs.content) {
      // 情况2：有分类编号但缺失反馈内容，提供预填按钮
      const category = loaded.data.categories.find(category => category.id === commandArgs.categoryId);
      const categoryName = category ? category.name : `分类${commandArgs.categoryId}`;
      const md = Format.createMarkdown();

      md.addText(`【${categoryName}】请输入反馈内容（10-200字）：`);
      md.addText(' ');
      md.addButton(markdownButtonLabel('输入反馈'), { data: `/提交反馈 ${commandArgs.categoryId} ` });
      md.addText(' ');
      md.addButton(markdownButtonLabel('返回选分类'), { data: '/提交反馈' });
      md.addNewline();

      void message.send(FormatGui({ isPrivate, bid, title: '提交反馈', content: md }));

      return;
    }

    if (commandArgs.categoryId && commandArgs.content) {
      // 情况1：完整的反馈提交
      const result = loaded.data.result;

      if (!result) {
        throw new Error('反馈提交响应不完整');
      }

      const feedbackId = result.feedbackId;
      const md = Format.createMarkdown();

      md.addText(`成功反馈，编号为:${feedbackId}`);
      md.addText(' ');
      md.addButton(markdownButtonLabel('查看反馈'), { data: `/查看反馈 ${feedbackId}` });
      md.addText(' ');
      md.addButton(markdownButtonLabel('我的反馈'), { data: '/我的反馈' });
      md.addNewline();

      void message.send(FormatGui({ isPrivate, bid, title: '提交反馈', content: md }));

      return;
    }

    // 其他情况，引导回分类选择
    const md = Format.createMarkdown();

    md.addText('请先选择反馈分类：');
    md.addText(' ');
    md.addButton(markdownButtonLabel('选择分类'), { data: '/提交反馈' });
    md.addText(' ');
    md.addButton(markdownButtonLabel('我的反馈'), { data: '/我的反馈' });
    md.addNewline();

    void message.send(FormatGui({ isPrivate, bid, title: '提交反馈', content: md }));
  } catch (error) {
    logger.error('提交反馈处理失败:', error);
    const md = Format.createMarkdown();

    md.addText('反馈提交失败，请稍后再试或联系运营。');

    void message.send(FormatGui({ isPrivate, bid, title: '提交反馈', content: md }));
  }
});
