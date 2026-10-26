import { useMessage } from '@src/utils/useMessage';
/**
 * 创建宗门指令响应处理
 * 指令格式: /创建宗门 宗门名
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildCreate } from '@src/api/bot/guild-membership-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    // 解析指令参数
    const messageText = e.MessageText || '';
    const match = messageText.match(/^[!！/#＃]?创建宗门\s+(.+?)$/);

    const sendFailure = async (text: string) => {
      const md = Format.createMarkdown().addBold('创建失败').addNewline().addText(text);

      await message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
    };
    const loaded = await runRobotBusiness(e, 'guild.create', { name: match?.[1] ? match[1].trim() : null }, parseRobotGuildCreate, next, async reply => {
      await sendFailure(reply.text);
    }).catch(async error => {
      await sendFailure(error instanceof Error ? error.message : '创建宗门失败');

      return { handled: true as const };
    });

    if (loaded.handled) {
      return;
    }

    if (loaded.data.outcome === 'usage') {
      const md = Format.createMarkdown();

      md.addBold('创建宗门');
      md.addNewline();
      md.addText('请输入宗门名称');
      md.addNewline();
      md.addText('');
      md.addNewline();
      md.addText('**使用格式：**');
      md.addNewline();
      md.addText('/创建宗门 宗门名');
      md.addNewline();
      md.addText('');
      md.addNewline();
      md.addText('**注意事项：**');
      md.addNewline();
      md.addText('• 宗门名称限制2-6个字');
      md.addNewline();
      md.addText('• 只能包含中文、英文和数字');
      md.addNewline();
      md.addText('• 创建宗门需要消耗100灵石');
      md.addNewline();
      md.addText('• 创建后您将成为宗主');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '创建宗门', command: '/创建宗门' }] }));

      return;
    }

    const result = loaded.data;

    // 显示确认信息
    const md = Format.createMarkdown();

    {
      md.addBold('创建成功');
      md.addNewline();
      md.addText(result.data.message);
      md.addNewline();
      md.addText('');
      md.addNewline();
      md.addText('**接下来您可以：**');
      md.addNewline();
      md.addText('• 设置宗门公告');
      md.addNewline();
      md.addText('• 招收宗门成员');
      md.addNewline();
      md.addText('• 提升宗门等级');
      md.addNewline();
      md.addText('• 建设宗门设施');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '查看宗门信息', command: '/我的宗门' }] }));
    }
  } catch (error) {
    logger.error('创建宗门指令处理失败:', error);
    const md = Format.createMarkdown();

    md.addText('创建宗门失败，请稍后再试或联系运营。');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
