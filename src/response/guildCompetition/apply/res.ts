import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotCompetitionTeamAction } from '@src/api/bot/competition-team-robot-query';
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
        title: '宗门大比 - 报名',
        header: [{ label: '返回', command: '/宗门大比' }],
        content: md,
        footer: [{ label: '宗门大比', command: '/宗门大比' }]
      })
    );
  };
  const loaded = await runRobotBusiness(
    e,
    'competition.apply',
    {},
    value => parseRobotCompetitionTeamAction(value),
    next,
    async reply => {
      await send(reply.text);
    }
  ).catch(async error => {
    await send(error instanceof Error ? error.message : '报名失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  await send(loaded.data.message);
});
