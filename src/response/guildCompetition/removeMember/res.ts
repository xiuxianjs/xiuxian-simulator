import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotCompetitionTeamAction, competitionRemoveArguments } from '@src/api/bot/competition-team-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const send = async (text: string) => {
    const md = Format.createMarkdown();

    md.addText(text);
    md.addNewline();
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '宗门大比',
        header: [{ label: '返回', command: '/宗门大比' }],
        content: md,
        footer: [{ label: '宗门大比', command: '/宗门大比' }]
      })
    );
  };
  const loaded = await runRobotBusiness(
    e,
    'competition.member-remove',
    competitionRemoveArguments(e.MessageText ?? ''),
    value => parseRobotCompetitionTeamAction(value, true),
    next,
    async reply => {
      await send(reply.text);
    }
  ).catch(async error => {
    await send(error instanceof Error ? error.message : '移除成员失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  if (loaded.data.outcome === 'usage') {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText('指令格式：/移除宗门大比成员 [位置(1-6)]') }));

    return;
  }
  await send(loaded.data.message);
});
