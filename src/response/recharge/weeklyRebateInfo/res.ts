import { useMessage } from '@src/utils/useMessage';
import { parseBackendWeeklyRebate } from '@src/api/bot/weekly-rebate-queries';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, parentNext] = useEvent();

  const send = async (
    title: string,
    md: ReturnType<typeof Format.createMarkdown>,
    options?: {
      footer?: Array<{ label: string; command: string }>;
    }
  ) => {
    await message.send(FormatGui({ header: [{ label: '返回权益', command: '/我的权益' }], isPrivate, bid, title, content: md, footer: options?.footer }));
  };

  try {
    const response = await runRobotBusiness(e, 'recharge.weekly-info', {}, parseBackendWeeklyRebate, parentNext, async reply => {
      await message.send(
        FormatGui({
          header: [{ label: '返回权益', command: '/我的权益' }],
          isPrivate,
          bid,
          title: '周周返利',
          content: Format.createMarkdown().addText(reply.text)
        })
      );
    });

    if (response.handled) {
      return;
    }
    const data = response.data;
    const result = { ...data, dayRewards: data.rewards };

    const md = Format.createMarkdown();

    md.addText(`今日：${result.todayLabel}`);
    md.addNewline();
    md.addText(`今日充值：${result.todayRechargeText}元/${result.thresholdYuan}元`);
    md.addNewline();

    for (const day of result.dayRewards) {
      const title = day.canClaim ? `${day.label} · 可领取` : `${day.label} · ${day.statusTag}`;

      md.addBlockquote(createQuoteMarkdown([title, day.rewardText], day.canClaim ? [{ label: '领取', command: `/周周返利领取 ${day.day}` }] : []));
    }

    md.addNewline();

    await send('周周返利', md, {
      footer: [{ label: '充值', command: '/充值' }]
    });
  } catch (error) {
    logger.error('查询周周返利信息失败:', error);
    const md = Format.createMarkdown();

    md.addText('查询失败，请稍后再试。');
    await send('周周返利', md);
  }
});
