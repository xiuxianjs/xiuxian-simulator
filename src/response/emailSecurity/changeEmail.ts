import { runRobotBusiness } from '@src/response/robotBusiness';
import { useMessage } from '@src/utils/useMessage';
/**
 * 更换邮箱指令
 * 用法：/更换邮箱 <新邮箱地址>
 * 发送验证码到旧邮箱后，用户发送 /验证 <6位数字> 完成更换。
 */
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, parentNext] = useEvent();

  const sendText = async (text: string) => {
    const md = Format.createMarkdown();

    md.addText(text);

    await message.send(FormatGui({ isPrivate, bid, title: isPrivate ? '更换邮箱' : '账号安全', content: md, ...(isPrivate ? {} : { bar: false }) }));
  };

  try {
    const result = await runRobotBusiness(
      e,
      'account.change-email',
      { input: e.MessageText, private: isPrivate },
      value => {
        if (
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          !('oldEmail' in value) ||
          !('newEmail' in value) ||
          typeof value.oldEmail !== 'string' ||
          typeof value.newEmail !== 'string'
        ) {
          throw new Error('邮箱验证响应不完整');
        }

        return { oldEmail: value.oldEmail, newEmail: value.newEmail };
      },
      parentNext,
      reply => sendText(reply.text)
    );

    if (result.handled) {
      return;
    }
    const { oldEmail, newEmail } = result.data;

    await sendText(`验证码已发送至旧邮箱：【${oldEmail.split('').join(' ')}】\n新邮箱：【${newEmail.split('').join(' ')}】\n请在3分钟内发送：/验证 6位验证码`);
  } catch (error) {
    logger.error('更换邮箱指令处理失败:', error);
    await sendText(
      isPrivate ? (error instanceof Error ? error.message : '更换邮箱失败，请稍后再试') : '安全中心及账号安全操作仅限私聊，请私聊机器人发送指令。'
    );
  }
});
