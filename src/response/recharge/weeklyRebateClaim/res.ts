import { useMessage } from '@src/utils/useMessage';
import { parseRobotWeeklyRebateClaim } from '@src/api/bot/weekly-rebate-claim';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { issuedRewardText } from '@src/utils/issuedRewardText';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

const DAY_LABELS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日', '满勤大奖'];

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, parentNext] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const send = async (title: string, md: ReturnType<typeof Format.createMarkdown>) => {
    await message.send(
      FormatGui({
        header: [{ label: '返回权益', command: '/我的权益' }],
        isPrivate,
        bid,
        title,
        content: md,
        footer: [{ label: '周周返利', command: '/周周返利' }]
      })
    );
  };
  let data: ReturnType<typeof parseRobotWeeklyRebateClaim>;

  try {
    const response = await runRobotBusiness(
      e,
      'recharge.weekly-rebate-claim',
      { input: e.MessageText ?? '' },
      parseRobotWeeklyRebateClaim,
      parentNext,
      async reply => {
        await message.send(
          FormatGui({
            header: [{ label: '返回权益', command: '/我的权益' }],
            isPrivate,
            bid,
            title: '周周返利',
            content: Format.createMarkdown().addText(reply.text)
          })
        );
      }
    );

    if (response.handled) {
      return;
    }
    data = response.data;
  } catch (error) {
    logger.error('领取周周返利奖励失败:', error);
    await send('周周返利', Format.createMarkdown().addText(error instanceof Error ? error.message : '领取失败，请稍后再试。'));

    return;
  }
  const label = DAY_LABELS[data.dayIndex] ?? `第${data.dayIndex}天`;
  const rewardText = issuedRewardText(data.issued);

  await send('周周返利', Format.createMarkdown().addBlockquote(createQuoteMarkdown([`${label} · 已领取`, `获得：${rewardText}`])));
});
