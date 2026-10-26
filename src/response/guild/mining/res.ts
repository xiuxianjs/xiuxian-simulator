import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildMining } from '@src/api/bot/guild-activity-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const send = (text: string) => message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));

  try {
    const loaded = await runRobotBusiness(e, 'guild.mining', {}, parseRobotGuildMining, next, async reply => {
      await send(reply.text);
    });

    if (loaded.handled) {
      return;
    }
    if (loaded.data.outcome === 'in_progress') {
      const md = Format.createMarkdown().addText(loaded.data.message);

      appendMiddlewareAdvice(md, [
        {
          command: '/宗门日常',
          description: '采矿尚未达到本次结算时机，按原提示的剩余时间等待，查看日常面板中的采矿状态；重复请求不会加快产出，不重置或重复开始'
        }
      ]);
      await message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }
    void send(loaded.data.message);
  } catch (error) {
    await send(error instanceof Error ? error.message : '挖矿失败');
  }
});
