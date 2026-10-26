import { useMessage } from '@src/utils/useMessage';
import { BackendAPIError } from '@src/api/bot/client';
import { parseBackendNewcomerRechargeClaim } from '@src/api/bot/newcomer-recharge-claim';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, parentNext] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const feedback = async (text: string) => {
    await message.send(
      FormatGui({ header: [{ label: '返回权益', command: '/我的权益' }], isPrivate, bid, title: '新人返利', content: Format.createMarkdown().addText(text) })
    );
  };
  let data: ReturnType<typeof parseBackendNewcomerRechargeClaim>;

  try {
    const response = await runRobotBusiness(
      e,
      'recharge.newcomer-claim',
      { input: e.MessageText ?? '' },
      parseBackendNewcomerRechargeClaim,
      parentNext,
      reply => feedback(reply.text)
    );

    if (response.handled) {
      return;
    }
    data = response.data;
  } catch (error) {
    logger.error('领取新人狂欢奖励失败:', error);
    await feedback(error instanceof BackendAPIError ? error.message : '领取失败，请稍后再试。');

    return;
  }
  await message.send(
    FormatGui({
      header: [{ label: '返回权益', command: '/我的权益' }],
      isPrivate,
      bid,
      title: '新人返利',
      content: Format.createMarkdown().addBlockquote(createQuoteMarkdown([`第${data.dayIndex}天 · 已领取`, `获得：${data.rewardText}`])),
      footer: [{ label: '新人返利', command: '/新人返利' }]
    })
  );
});
