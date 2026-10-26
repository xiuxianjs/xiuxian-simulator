import { Format, onResponse, useEvent } from 'alemonjs';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parsePKCommandInteger } from '@src/api/bot/pk-management';
import { parsePKReport } from '@src/api/bot/pk-history';
import { formatGameTime } from '@src/utils/gameTime';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const args = e.MessageText.replace(/^(!|！|\/|#|＃)?争夺战报\s*/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const reportId = args.length === 1 ? parsePKCommandInteger(args[0]) : null;
  const send = async (text: string) => {
    await message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title: '争夺战报', content: Format.createMarkdown().addText(text) }));
  };

  try {
    const result = await runRobotBusiness(
      e,
      'pvp.pk-report',
      { reportId },
      raw => {
        const data = parsePKReport(raw);

        if (data.summary.reportId !== reportId) {
          throw new Error('战报编号不匹配');
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
    const row = data.summary;
    const lines = [
      `${row.viewerRole === 'attacker' ? '我发起' : '我被打'} · ${row.opponentName}`,
      row.resultText,
      row.moneyText,
      row.originalAssetText,
      row.counterStatusText
    ];

    if (row.counterDeadline) {
      lines.push(`反击截止：${formatGameTime(row.counterDeadline)}`);
    }
    const actions: { label: string; command: string }[] = [];

    if (row.canCounterAttack) {
      actions.push({ label: '免费反击', command: `/回击 ${row.reportId}` });
    }
    if (data.hasOrdinaryReplay) {
      actions.push({ label: '原战回放', command: `/争夺回放 ${row.reportId} 原战 1` });
    }
    if (data.hasCounterReplay) {
      actions.push({ label: '反击回放', command: `/争夺回放 ${row.reportId} 反击 1` });
    }
    const md = Format.createMarkdown().addBlockquote(createQuoteMarkdown(lines, actions));

    await message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid: e.UserId,
        title: `战报 #${row.reportId}`,
        content: md,
        footer: [
          { label: '刷新战报', command: `/争夺战报 ${row.reportId}` },
          { label: '争夺历史', command: '/争夺历史' }
        ]
      })
    );
  } catch {
    await send('读取争夺战报失败，请刷新该战报确认最新状态。');
  }
});
