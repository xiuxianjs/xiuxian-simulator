import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildContentAction } from '@src/api/bot/guild-content-action-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const match = (e.MessageText?.trim() ?? '').match(/^[!！/#＃]?移除精华\s+(\d+)$/);
  const args = { essenceId: match ? Number(match[1]) : null };
  const send = (text: string) => message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));

  try {
    const loaded = await runRobotBusiness(
      e,
      'guild.essence-remove',
      args,
      value => parseRobotGuildContentAction(value, 'essence-remove'),
      next,
      async reply => {
        await send(reply.text);
      }
    );

    if (loaded.handled) {
      return;
    }
    if (loaded.data.outcome === 'usage') {
      const md = Format.createMarkdown();

      md.addText('使用方法：移除精华 ID');
      md.addNewline();
      md.addText('说明：ID可通过"宗门精华"指令查看');
      md.addNewline();
      md.addText('权限：长老及以上职位');
      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }
    void send(loaded.data.message);
  } catch (error) {
    await send(error instanceof Error ? error.message : '移除精华失败');
  }
});
