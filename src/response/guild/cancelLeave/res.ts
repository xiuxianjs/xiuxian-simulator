import { useMessage } from '@src/utils/useMessage';
/**
 * 取消退出宗门指令响应处理
 * 指令格式: /取消退出宗门
 * 主动取消退出宗门的二次确认
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseGuildLeaveCancel } from '@src/api/bot/guild-leave-confirmation-cancel';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  const send = async (text: string) => {
    await message.send(
      FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text), footer: [{ label: '返回宗门', command: '/我的宗门' }] })
    );
  };

  try {
    const loaded = await runRobotBusiness(e, 'guild.leave-cancel', {}, parseGuildLeaveCancel, next, async reply => {
      await send(reply.text);
    });

    if (loaded.handled) {
      return;
    }
    await send('✅ 已取消退出宗门操作');
  } catch (error) {
    await send(error instanceof Error ? error.message : '取消操作失败');
  }
});
