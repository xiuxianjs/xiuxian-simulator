import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { useMessage } from '@src/utils/useMessage';
/**
 * 查看宗门简介
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildContent } from '@src/api/bot/guild-content-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const send = (text: string) => message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));

  try {
    const loaded = await runRobotBusiness(e, 'guild.intro', {}, parseRobotGuildContent, next, async reply => {
      await send(reply.text);
    });

    if (loaded.handled) {
      return;
    }
    const result = { data: loaded.data };

    const md = Format.createMarkdown();

    md.addBold(`【${result.data.guildName}】宗门简介`);
    md.addNewline();

    md.addButton(markdownButtonLabel('返回'), { data: '/我的宗门' });
    md.addNewline();

    md.addText(result.data.intro ?? '暂无简介');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  } catch (error) {
    await send(error instanceof Error ? error.message : '查询简介失败');
  }
});
