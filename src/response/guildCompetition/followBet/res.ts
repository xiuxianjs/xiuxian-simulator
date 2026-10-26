import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { competitionBetArguments, parseRobotCompetitionBet } from '@src/api/bot/competition-bets-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

const BET_AMOUNTS = [1000, 5000, 10000, 50000, 100000] as const;

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const send = async (text: string) => {
    const md = Format.createMarkdown();

    md.addText(text);
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '宗门大比 - 追投',
        header: [
          { label: '返回', command: '/宗门大比' },
          { label: '押注记录', command: '/查看押注记录' }
        ],
        content: md
      })
    );
  };
  const loaded = await runRobotBusiness(
    e,
    'competition.follow-bet',
    competitionBetArguments(e.MessageText ?? '', true),
    parseRobotCompetitionBet,
    next,
    async reply => {
      await send(reply.text);
    }
  ).catch(async error => {
    await send(error instanceof Error ? error.message : '追投失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  if (loaded.data.outcome === 'choices') {
    const md = Format.createMarkdown();

    md.addText('请选择追投金额');
    md.addNewline();

    const amountButtons = BET_AMOUNTS.map(amount => ({
      label: `${amount}`,
      command: `/追投宗门大比 ${amount}`
    }));

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '宗门大比 - 追投',
        header: [
          { label: '返回', command: '/宗门大比' },
          { label: '押注记录', command: '/查看押注记录' }
        ],
        content: md,
        footer: [amountButtons]
      })
    );

    return;
  }

  if (loaded.data.outcome === 'usage') {
    const md = Format.createMarkdown();

    md.addText('指令格式：/追投宗门大比 [灵石数量]');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  if (loaded.data.outcome === 'result') {
    await send(loaded.data.message);
  }
});
