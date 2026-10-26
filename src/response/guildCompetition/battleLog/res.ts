import { competitionBattleView } from './view';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseCompetitionBattles } from '@src/api/bot/competition-battle-queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const text = (e.MessageText ?? '').trim();
  const cleaned = text.replace(/^(!|！|\/|#|＃)?\s*/, '');
  const match = cleaned.match(/^宗门大比战斗记录(?:\s+(\d+))?$/);

  if (!match) {
    return;
  }

  const page = Math.max(1, Number(match[1] ?? 1));

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));
  };
  const loaded = await runRobotBusiness(e, 'competition.battles', { pageText: String(page) }, parseCompetitionBattles, next, async reply => {
    await sendFailure(reply.text);
  }).catch(async error => {
    await sendFailure(error instanceof Error ? error.message : '获取战斗记录失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const appResult = competitionBattleView(loaded.data);

  if (appResult.code === 'NO_GUILD') {
    const md = Format.createMarkdown();

    md.addText(appResult.data.message);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  if (appResult.code === 'NO_RECORDS') {
    const md = Format.createMarkdown();

    md.addBold('宗门大比战斗记录');
    md.addNewline();
    md.addText(appResult.data.message);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  if (appResult.code === 'LOAD_FAILED') {
    const md = Format.createMarkdown();

    md.addText(appResult.data.message);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  const { records, count, totalPages } = appResult.data;

  const md = Format.createMarkdown();

  for (const r of records) {
    const isWin = r.isWin;
    const stageName = r.stage === 1 ? '淘汰赛' : r.stage === 2 ? '晋级赛' : `未知(${r.stage})`;

    md.addBlockquote(
      createQuoteMarkdown(
        [`${isWin ? '✅' : '❌'} VS ${r.opponentName}`, `${stageName} | ${r.formattedTime}`],
        [{ label: '详情', command: `/宗门大比战斗详情 ${r.id}` }]
      )
    );
  }

  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '宗门大比 - 战斗记录',
      header: [{ label: '返回', command: '/宗门大比' }],
      content: md,
      nav: totalPages > 1 ? { current: page, total: totalPages, count: Number(count), command: '/宗门大比战斗记录 {page}' } : undefined,
      footer: [{ label: '宗门大比', command: '/宗门大比' }]
    })
  );
});
