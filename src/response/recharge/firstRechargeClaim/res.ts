import { useMessage } from '@src/utils/useMessage';
import { parseRobotFirstRechargeClaim } from '@src/api/bot/first-recharge-claim';
import { issuedRewardText } from '@src/utils/issuedRewardText';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, parentNext] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const feedback = async (text: string) => {
    await message.send(
      FormatGui({ header: [{ label: '返回充值', command: '/充值' }], isPrivate, bid, title: '首充礼包', content: Format.createMarkdown().addText(text) })
    );
  };
  let data: ReturnType<typeof parseRobotFirstRechargeClaim>;

  try {
    const result = await runRobotBusiness(e, 'recharge.first-claim', { input: e.MessageText ?? '' }, parseRobotFirstRechargeClaim, parentNext, reply => feedback(reply.text)
    );

    if (result.handled) {
      return;
    }
    data = result.data;
  } catch (error) {
    logger.error('领取礼包奖励失败:', error);
    await feedback('领取失败，请稍后再试。');

    return;
  }
  const rewardText = issuedRewardText(data.issued);

  await message.send(
    FormatGui({
      header: [{ label: '返回充值', command: '/充值' }],
      isPrivate,
      bid,
      title: '首充礼包',
      content: Format.createMarkdown().addBlockquote(createQuoteMarkdown([`${data.tierYuan}元档 · 已领取`, `获得：${rewardText}`]))
    })
  );
});
