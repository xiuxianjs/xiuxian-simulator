import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendGuildCompetitionKnockoutCandidates } from '@src/api/bot/competition-knockout-candidates-query';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));
  };
  const loaded = await runRobotBusiness(e, 'competition.candidates', {}, parseBackendGuildCompetitionKnockoutCandidates, next, async reply => {
    await sendFailure(reply.text);
  }).catch(async error => {
    await sendFailure(error instanceof Error ? error.message : '获取挑战列表失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const appResult = {
    data: {
      score: loaded.data.score,
      remain: loaded.data.remaining,
      list: loaded.data.candidates.map(item => ({ guildId: item.guildId, guildName: item.guildName, memberSlots: item.slots }))
    }
  };
  const { score, remain, list } = appResult.data;

  const md = Format.createMarkdown();

  md.addBlockquote(Format.createMarkdown().addText(`当前积分：${score}，剩余挑战次数：${remain}`));

  if (list.length <= 0) {
    md.addText('暂无可挑战宗门');

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '宗门大比 - 参与挑战',
        header: [{ label: '返回', command: '/宗门大比' }],
        content: md
      })
    );

    return;
  }

  for (const item of list) {
    const defenderGuildId = item.guildId;
    const defenderGuildName = item.guildName;

    const slots = item.memberSlots;
    const hasAny = slots.some(Boolean);

    if (!hasAny) {
      md.addBlockquote(createQuoteMarkdown([`【${defenderGuildName}】`, '参赛成员：暂无'], [{ label: '挑战', command: `/挑战宗门 ${defenderGuildId}` }]));
      continue;
    }

    const memberNames = slots
      .map((slot, i) => {
        const pos = i + 1;

        if (slot) {
          return `${pos}.${slot.name}`;
        }

        return `${pos}.空`;
      })
      .join(' ');

    md.addBlockquote(createQuoteMarkdown([`【${defenderGuildName}】`, memberNames], [{ label: '挑战', command: `/挑战宗门 ${defenderGuildId}` }]));
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '宗门大比 - 参与挑战',
      header: [{ label: '返回', command: '/宗门大比' }],
      content: md
    })
  );
});
