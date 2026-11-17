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

    if (data.statusTransfer) {
      const status = data.statusTransfer;
      const change = row.viewerRole === 'attacker' ? '夺得' : '失去';

      lines.push(`${change} 1 张${status.name}效果，${formatGameTime(status.expiresAt)} 到期。`);
      actions.push({ label: '我的状态', command: '/我的状态' });
    }

    if (data.pursuitState) {
      const state = { open: '等待道友出战', fighting: '正在交手', expired_settling: '已到期，结算中', paid: '已追回并付赏', refunded: '赏金已退还' }[
        data.pursuitState
      ];

      if (state) {
        lines.push(`委托状态：${state}`);
      }
    }
    if (data.latestPursuit) {
      const latest = data.latestPursuit;

      lines.push(
        latest.state === 'won'
          ? '追击结果：原物已归还'
          : latest.state === 'lost'
            ? `追击结果：未追回 · 反劫分成 ${latest.share} 灵晶 · 回收 ${latest.recycled} 灵晶`
            : '追击结果：本场作废，已退还出战灵晶'
      );
    }
    if (row.canCounterAttack) {
      lines.push('说明：反击采用双方当时的实力，修为按原战报的秘境基准结算。');
      actions.push({ label: data.canPublishPursuit || data.pursuitState ? '亲自反击' : '免费反击', command: `/回击 ${row.reportId}` });
    }
    if (data.canPublishPursuit) {
      actions.push({ label: '委托追回', command: `/委托追回 ${row.reportId}` });
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
