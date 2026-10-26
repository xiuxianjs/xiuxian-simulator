import { runRobotBusiness } from '@src/response/robotBusiness';
import { useMessage } from '@src/utils/useMessage';
/**
 * 绑定邮箱指令
 * 用法：/绑定邮箱 <邮箱地址>
 * 发送验证码后，用户发送 /验证 <6位数字> 完成绑定。
 */
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, parentNext] = useEvent();

  const sendText = async (text: string, footer?: { label: string; command: string }[]) => {
    const md = Format.createMarkdown();

    md.addText(text);

    await message.send(FormatGui({ isPrivate, bid, title: isPrivate ? '绑定邮箱' : '账号安全', content: md, footer, ...(isPrivate ? {} : { bar: false }) }));
  };

  try {
    const result = await runRobotBusiness(
      e,
      'account.bind-email',
      { input: e.MessageText, private: isPrivate },
      value => {
        if (!value || typeof value !== 'object' || Array.isArray(value) || !('email' in value) || typeof value.email !== 'string' || !value.email) {
          throw new Error('绑定邮箱响应不完整');
        }

        return { email: value.email };
      },
      parentNext,
      reply => sendText(reply.text)
    );

    if (result.handled) {
      return;
    }
    const { email } = result.data;

    await sendText(`验证码已发送至：【${email.split('').join(' ')}】\n请在3分钟内发送：/验证 6位验证码`);
  } catch (error) {
    logger.error('绑定邮箱指令处理失败:', error);
    await sendText(
      isPrivate ? (error instanceof Error ? error.message : '绑定邮箱失败，请稍后再试') : '安全中心及账号安全操作仅限私聊，请私聊机器人发送指令。'
    );
  }
});
