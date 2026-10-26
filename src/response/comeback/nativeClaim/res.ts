import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseNativeComebackClaim } from '@src/api/bot/native-comeback';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const md = Format.createMarkdown();
  const [, next] = useEvent();
  const renderFailure = async (text: string) => {
    const content = Format.createMarkdown();

    content.addText(text);
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '回归签到',
        content,
        footer: [
          { label: '回归奖励', command: '/回归奖励' },
          { label: '我的信息', command: '/我的信息' }
        ]
      })
    );
  };
  let data: ReturnType<typeof parseNativeComebackClaim>;

  try {
    const loaded = await runRobotBusiness(e, 'native-comeback.claim', {}, parseNativeComebackClaim, next, reply => renderFailure(reply.text));

    if (loaded.handled) {
      return;
    }
    data = loaded.data;
  } catch (error) {
    await renderFailure(error instanceof Error ? error.message : '领取本服回归奖励失败');

    return;
  }

  md.addText(data.message);

  if (data.rewardSummary.length > 0) {
    md.addNewline();
    md.addNewline();
    for (const reward of data.rewardSummary) {
      md.addText(reward);
      md.addNewline();
    }
  }

  const footer = [
    { label: '回归奖励', command: '/回归奖励' },
    { label: '我的信息', command: '/我的信息' }
  ];

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '回归签到',
      content: md,
      footer
    })
  );
});
