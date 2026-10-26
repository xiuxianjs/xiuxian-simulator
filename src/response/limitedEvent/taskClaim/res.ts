import { useMessage } from '@src/utils/useMessage';
import { parseBackendLimitedEventTask } from '@src/api/bot/limited-event-actions';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { displayCurrencyText } from '@src/constants/currency';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, parentNext] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const md = Format.createMarkdown();
  const sendFeedback = async (text: string) => {
    const content = Format.createMarkdown().addText(text);

    if (text === '格式：/活动任务领取 <任务ID>') {
      await message.send(FormatGui({ isPrivate, bid, title: '活动任务领取', content }));

      return;
    }
    content.addNewline();
    await message.send(FormatGui({ isPrivate, bid, title: '活动任务领取', header: [{ label: '返回任务', command: '/活动任务' }], content }));
  };
  let data: ReturnType<typeof parseBackendLimitedEventTask>;

  try {
    const response = await runRobotBusiness(e, 'limited-event.task-claim', { input: e.MessageText ?? '' }, parseBackendLimitedEventTask, parentNext, reply => sendFeedback(reply.text)
    );

    if (response.handled) {
      return;
    }
    data = response.data;
  } catch (error: unknown) {
    await sendFeedback(error instanceof Error ? error.message : '领取失败，请稍后再试');

    return;
  }
  const rewardText = data.issued.map(reward => `${displayCurrencyText(reward.name)}×${reward.amount}`).join('、');

  md.addText('✅ 任务奖励领取成功！');
  md.addNewline();
  md.addBlockquote(Format.createMarkdown().addText(`获得：${rewardText}`));
  md.addNewline();
  void message.send(FormatGui({ isPrivate, bid, title: '活动任务领取', header: [{ label: '返回任务', command: '/活动任务' }], content: md }));
});
