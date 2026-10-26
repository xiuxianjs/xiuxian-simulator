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
  const match = (e.MessageText?.trim() ?? '').match(/^[!！/#＃]?设置宗门简介\s+(.+)$/);
  const args = { content: match ? match[1].trim() : null };
  const send = (text: string) => message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));

  try {
    const loaded = await runRobotBusiness(
      e,
      'guild.intro-set',
      args,
      value => parseRobotGuildContentAction(value, 'intro-set'),
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

      md.addText('使用方法：设置宗门简介 内容');
      md.addNewline();
      md.addText('说明：简介内容不能超过30字');
      md.addNewline();
      md.addText('权限：副宗主及以上职位');
      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }
    void send(loaded.data.message);
  } catch (error) {
    await send(error instanceof Error ? error.message : '设置宗门简介失败');
  }
});
