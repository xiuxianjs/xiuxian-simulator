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
  const match = (e.MessageText ?? '').match(/^[!！/#＃]?宗门改名\s+(.+?)$/);
  const markdown = () => Format.createMarkdown().addBold('宗门改名').addNewline();
  const send = (text: string) => message.send(FormatGui({ isPrivate, bid, title: '', content: markdown().addText(text) }));

  try {
    const loaded = await runRobotBusiness(
      e,
      'guild.rename',
      { name: match?.[1] ? match[1].trim() : null },
      value => parseRobotGuildSetting(value, 'rename'),
      next,
      async reply => {
        await send(reply.text);
      }
    );

    if (loaded.handled) {
      return;
    }
    if (loaded.data.outcome === 'usage') {
      const md = markdown().addText('请输入新的宗门名称');

      md.addNewline();
      md.addText('使用格式：/宗门改名 新宗门名');
      md.addNewline();
      md.addText('宗门名称限制2-6个字，只能包含中文、英文和数字，改名消耗更名卡 ×1');
      void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '宗门改名', command: '/宗门改名' }] }));

      return;
    }
    void send(loaded.data.message);
  } catch (error) {
    await send(error instanceof Error ? error.message : '宗门改名失败，请稍后再试');
  }
});
