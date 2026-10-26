import { useMessage } from '@src/utils/useMessage';
/**
 * 解散宗门指令响应处理
 * 指令格式: /解散宗门
 * 需要二次确认
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildDissolve } from '@src/api/bot/guild-leadership-end-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    const sendFailure = async (text: string, buttons: Array<{ label: string; command: string }>) => {
      const md = Format.createMarkdown().addBold('解散失败').addText(text);

      await message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: buttons }));
    };
    const loaded = await runRobotBusiness(e, 'guild.dissolve', {}, parseRobotGuildDissolve, next, async reply => {
      await sendFailure(reply.text, reply.buttons);
    }).catch(async error => {
      await sendFailure(error instanceof Error ? error.message : '解散宗门失败', [
        { label: '宗门信息', command: '/我的宗门' },
        { label: '我', command: '/我' }
      ]);

      return { handled: true as const };
    });

    if (loaded.handled) {
      return;
    }
    const result = loaded.data;

    if (result.outcome === 'confirmation_required') {
      const md = Format.createMarkdown();

      md.addBold('⚠️ 解散宗门确认');
      md.addText(`您确定要解散宗门【${result.guildName}】吗？`);
      md.addNewline();
      md.addText('');
      md.addNewline();
      md.addText('**注意事项：**');
      md.addNewline();
      md.addText('• 解散宗门后无法恢复');
      md.addText('• 所有成员将被移除');
      md.addNewline();
      md.addText('• 宗门灵石将平分给所有成员');
      md.addNewline();
      md.addText('• 宗门所有数据将被清除');
      md.addNewline();
      md.addText('');
      md.addNewline();
      md.addText('请在60秒内再次输入 /解散宗门 确认操作');

      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '',
          content: md,
          footer: [
            { label: '确认解散', command: '/解散宗门' },
            { label: '取消操作', command: '/我的宗门' }
          ]
        })
      );

      return;
    }

    if (result.outcome === 'dissolved') {
      const md = Format.createMarkdown();

      md.addBold('解散成功');
      md.addNewline();
      md.addText(result.message);
      md.addNewline();
      md.addText('');
      md.addNewline();
      md.addText('感谢您对宗门的付出！');

      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '',
          content: md,
          footer: [
            { label: '宗门信息', command: '/我的宗门' },
            { label: '我', command: '/我' }
          ]
        })
      );
    }
  } catch (error) {
    logger.error('解散宗门指令处理失败:', error);
    const md = Format.createMarkdown();

    md.addBold('宗门错误');
    md.addText('解散宗门失败，请稍后再试或联系运营。');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
