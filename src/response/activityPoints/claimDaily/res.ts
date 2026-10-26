import { useMessage } from '@src/utils/useMessage';
/**
 * 领取日常活跃奖励指令响应
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotActivityClaim, activityClaimFailureText } from '@src/api/bot/activity-points-robot';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const msg = e.MessageText?.trim() || '';

  const [, next] = useEvent();
  const renderFailure = async (text: string) => {
    const content = Format.createMarkdown().addText(text);

    await message.send(FormatGui({ isPrivate, bid, title: '日常活跃', content, footer: [{ label: '返回日常活跃', command: '/日常活跃' }] }));
  };

  try {
    const match = msg.match(/领取日常活跃奖励\s+(\d+)/);
    const args = match ? { mode: 'claim', requiredPoints: parseInt(match[1], 10) } : { mode: 'usage' };
    const loaded = await runRobotBusiness(e, 'activity-points.claim-daily', args, parseRobotActivityClaim, next, reply => renderFailure(reply.text));

    if (loaded.handled) {
      return;
    }
    const result = { data: loaded.data };
    const md = Format.createMarkdown();

    const rewardText = result.data.rewards.length > 0 ? result.data.rewards.map(reward => `${reward.name}×${reward.amount}`).join('、') : '无';

    md.addText(`【${result.data.userName}】领取日常活跃奖励成功！`);
    md.addNewline();
    md.addText(`🎯 活跃度阈值：${result.data.requiredPoints}`);
    md.addNewline();
    md.addText(`🎁 奖励：${rewardText}`);
    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '日常活跃',
        content: md,
        footer: [{ label: '返回日常活跃', command: '/日常活跃' }]
      })
    );
  } catch (error) {
    const md = Format.createMarkdown();

    md.addText(activityClaimFailureText(error, 'daily', parseInt(msg.match(/领取日常活跃奖励\s+(\d+)/)?.[1] ?? '', 10)));

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '日常活跃',
        content: md,
        footer: [{ label: '返回日常活跃', command: '/日常活跃' }]
      })
    );
  }
});
