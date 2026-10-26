import { Format, onResponse, useEvent } from 'alemonjs';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parsePKCommandInteger, parsePKTargets } from '@src/api/bot/pk-management';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const args = e.MessageText.replace(/^(!|！|\/|#|＃)?可打劫道友\s*/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const cursor = parsePKCommandInteger(args[0], 0);
  const send = async (text: string) => {
    await message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title: '可打劫道友', content: Format.createMarkdown().addText(text) }));
  };

  try {
    const result = await runRobotBusiness(e, 'pvp.pk-targets', { cursor: args.length > 1 ? null : cursor }, parsePKTargets, next, reply => send(reply.text));

    if (result.handled) {
      return;
    }
    const data = result.data;
    const md = Format.createMarkdown().addText(data.reason || `每次${data.qiCost}元力 · 今日剩余${data.dailyRemaining}/${data.dailyLimit}次。`);

    for (const row of data.items) {
      md.addNewline().addBlockquote(
        createQuoteMarkdown(
          [
            `${row.name} · ${row.realmName}`,
            `剩余${row.sameTargetRemaining}次`,
            `灵石收益 ×${row.rewardPercent / 100} · 物品机会${row.itemChancePercent}%（可能落空）`
          ],
          [
            { label: '查看', command: `/查看信息 ${row.uid}` },
            ...(data.canAttack && row.sameTargetRemaining > 0
              ? [
                  { label: '打劫', command: `/打劫 ${row.uid}` },
                  { label: '三连打劫', command: `/三连打劫 ${row.uid}` }
                ]
              : [])
          ]
        )
      );
    }
    if (!data.items.length && data.canAttack) {
      md.addNewline().addText('暂无可打劫的道友');
    }
    const footer = [
      { label: '刷新', command: '/可打劫道友' },
      { label: '被打记录', command: '/打劫记录' }
    ];

    if (data.nextCursor !== undefined) {
      footer.push({ label: '下一批', command: `/可打劫道友 ${data.nextCursor}` });
    }
    await message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title: '可打劫道友', content: md, footer }));
  } catch {
    await send('读取可打劫道友失败，请稍后重试。');
  }
});
