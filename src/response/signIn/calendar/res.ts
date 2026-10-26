import { Format, onResponse, useEvent } from 'alemonjs';
import { useMessage } from '@src/utils/useMessage';
import { FormatGui, createQuoteMarkdown } from '@src/utils/messageHelper';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseCheckInView } from '@src/api/bot/checkin-view';
import { selects } from '@src/response/config';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const args = e.MessageText.replace(/^\/?签到(?:日历|概览)/, '')
    .trim()
    .split(/\s+/);
  const scopes: Record<string, string> = {
    日常: 'daily',
    日期: 'dates',
    累计: 'milestones',
    新人: 'newcomer',
    活动: 'event',
    狂欢: 'carnival',
    时段: 'celestial'
  };
  const scope = e.MessageText.includes('签到概览') ? 'overview' : (scopes[args[0]] ?? 'daily');
  const feedback = (text: string) => message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid: e.UserId,
        title: '签到日历',
        content: Format.createMarkdown().addText(text),
        footer: [{ label: '返回签到', command: '/签到概览' }]
      })
    );

  try {
    const loaded = await runRobotBusiness(
      e,
      'checkin.view',
      { scope, page: /^\d+$/.test(args[1] ?? '') ? Math.min(Number(args[1]), 100) : 0 },
      parseCheckInView,
      next,
      async reply => {
        await feedback(reply.text);
      }
    );

    if (loaded.handled) {
      return;
    }
    const view = loaded.data;
    const md = Format.createMarkdown();

    for (const block of view.blocks) {
      md.addBlockquote(createQuoteMarkdown(block.text.split('\n'), block.buttons));
    }
    await message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title: view.title, content: md, footer: view.buttons }));
  } catch {
    await feedback('签到日历暂不可用，请稍后重试；查看日历不会执行签到。');
  }
});
