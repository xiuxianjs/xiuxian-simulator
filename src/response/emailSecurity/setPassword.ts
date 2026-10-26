import { parseBackendPasswordResult } from '@src/api/bot/account';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { useMessage } from '@src/utils/useMessage';
/**
 * 设置密码指令
 * 支持设置和修改官网登录密码
 * 指令格式：/设置密码 [密码]
 * 密码要求：至少6位
 */
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, parentNext] = useEvent();
  const sendFeedback = async (text: string) => {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: isPrivate ? '设置密码' : '账号安全',
        content: Format.createMarkdown().addText(text),
        ...(isPrivate ? {} : { bar: false })
      })
    );
  };

  try {
    const response = await runRobotBusiness(
      e,
      'account.set-password',
      { input: e.MessageText, private: isPrivate },
      (value, uid) => {
        const data = parseBackendPasswordResult(value);

        if (data.playerId !== uid || data.bid !== bid) {
          throw new Error('设置密码响应身份不一致');
        }

        return { bid: data.bid, uid: data.playerId };
      },
      parentNext,
      reply => sendFeedback(reply.text)
    );

    if (response.handled) {
      return;
    }
    const result = response.data;
    const md = Format.createMarkdown();

    md.addText('✅ 密码设置成功！');
    md.addNewline();
    md.addText(`平台ID：${result.bid}`);
    md.addNewline();
    md.addText(`游戏ID：${result.uid}`);
    md.addNewline();
    md.addText('⚠️ 请妥善保管密码，不要泄露给他人');

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '设置密码',
        content: md,
        footer: [{ label: '安全中心', command: '/安全中心' }]
      })
    );
  } catch {
    await sendFeedback(isPrivate ? '用户信息未找到，请先注册账号' : '安全中心及账号安全操作仅限私聊，请私聊机器人发送指令。');
  }
});
