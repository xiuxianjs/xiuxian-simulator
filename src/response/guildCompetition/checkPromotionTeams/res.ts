import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseCompetitionPromotionTeams } from '@src/api/bot/competition-read-projections';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));
  };
  const loaded = await runRobotBusiness(e, 'competition.promotion-teams', {}, parseCompetitionPromotionTeams, next, async reply => {
    await sendFailure(reply.text);
  }).catch(async error => {
    await sendFailure(error instanceof Error ? error.message : '查询晋级赛队伍失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const teams = loaded.data.teams;

  if (teams.length === 0) {
    const md = Format.createMarkdown();

    md.addText('暂无晋级赛队伍');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  const md = Format.createMarkdown();

  for (const t of teams) {
    md.addText(`【${Number(t.rank) || '-'}】${String(t.guildName)}`);
    md.addNewline();
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '宗门大比 - 晋级赛队伍',
      header: [{ label: '返回', command: '/宗门大比' }],
      content: md
    })
  );
});
