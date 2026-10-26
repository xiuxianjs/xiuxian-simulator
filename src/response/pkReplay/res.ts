import { Format, onResponse, useEvent } from 'alemonjs';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parsePKCommandInteger } from '@src/api/bot/pk-management';
import { parsePKReplay } from '@src/api/bot/pk-history';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const args = e.MessageText.replace(/^(!|！|\/|#|＃)?争夺回放\s*/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const reportId = parsePKCommandInteger(args[0]);
  const phase = args[1] === undefined || args[1] === '原战' ? 'ordinary' : args[1] === '反击' ? 'counter' : '';
  const page = args.length > 3 ? null : parsePKCommandInteger(args[2], 1);
  const send = async (text: string) => {
    await message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title: '争夺回放', content: Format.createMarkdown().addText(text) }));
  };

  try {
    const result = await runRobotBusiness(
      e,
      'pvp.pk-replay',
      { reportId, phase, page },
      raw => {
        const data = parsePKReplay(raw);

        if (data.summary.reportId !== reportId || data.phase !== phase || data.page !== page) {
          throw new Error('回放与请求不匹配');
        }

        return data;
      },
      next,
      reply => send(reply.text)
    );

    if (result.handled) {
      return;
    }
    const data = result.data;
    const label = data.phase === 'ordinary' ? '原战' : '反击';
    const md = Format.createMarkdown()
      .addText(`${data.summary.resultText} · ${data.summary.counterStatusText}`)
      .addNewline()
      .addCode(data.text, { language: 'markdown' });

    await message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid: e.UserId,
        title: `战报 #${data.summary.reportId} · ${label}回放`,
        content: md,
        nav: { current: data.page, total: data.totalPages, count: data.totalActions, command: `/争夺回放 ${data.summary.reportId} ${label} {page}` },
        footer: [{ label: '返回战报', command: `/争夺战报 ${data.summary.reportId}` }]
      })
    );
  } catch {
    await send('读取回放失败，请稍后重试');
  }
});
