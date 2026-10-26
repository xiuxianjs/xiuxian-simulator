import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildSetting } from '@src/api/bot/guild-settings-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const match = (e.MessageText?.trim() ?? '').match(/^[!！/#＃]?设置申请宗门最低境界\s+(.+)$/);
  const send = (text: string) => message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));

  try {
    const loaded = await runRobotBusiness(
      e,
      'guild.min-realm',
      { searchTerm: match ? match[1].trim() : null },
      value => parseRobotGuildSetting(value, 'min-realm'),
      next,
      async reply => {
        await send(reply.text);
      }
    );

    if (loaded.handled) {
      return;
    }
    if (loaded.data.outcome === 'usage') {
      const md = Format.createMarkdown().addText('使用方法：设置申请宗门最低境界 境界名称');

      md.addNewline();
      md.addText('例如：设置申请宗门最低境界 金丹期');
      md.addNewline();
      md.addText('取消限制：设置申请宗门最低境界 无');
      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }
    void send(loaded.data.message);
  } catch (error) {
    await send(error instanceof Error ? error.message : '设置失败');
  }
});
