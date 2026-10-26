import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotActivityClaimAll } from '@src/api/bot/activity-points-robot';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const msg = e.MessageText?.trim() || '';
  const isDaily = /^[!！/#＃]?(?:领取全部|一键领取)日常活跃奖励$/.test(msg);
  const isWeekly = /^[!！/#＃]?(?:领取全部|一键领取)周常活跃奖励$/.test(msg);

  if (!isDaily && !isWeekly) {
    return;
  }

  const type = isDaily ? 'daily' : 'weekly';
  const title = isDaily ? '日常活跃' : '周常活跃';
  const backCommand = isDaily ? '/日常活跃' : '/周常活跃';
  const [, next] = useEvent();
  const renderFailure = async (text: string) => {
    const content = Format.createMarkdown().addText(text);

    await message.send(FormatGui({ isPrivate, bid, title, content, footer: [{ label: '返回', command: backCommand }] }));
  };

  try {
    const loaded = await runRobotBusiness(e, `activity-points.claim-all-${type}`, {}, parseRobotActivityClaimAll, next, reply => renderFailure(reply.text));

    if (loaded.handled) {
      return;
    }
    const result = { data: loaded.data };
    const md = Format.createMarkdown();

    md.addText(
      result.data.partial
        ? `已领取部分${type === 'daily' ? '日常' : '周常'}活跃奖励：`
        : `【${result.data.userName}】一键领取${type === 'daily' ? '日常' : '周常'}活跃奖励成功！`
    );
    md.addNewline();
    md.addNewline();

    if (result.data.taskRewards.length > 0) {
      md.addText(`任务奖励：${result.data.taskRewards.map(reward => `${reward.name}×${reward.amount}`).join('、')}`);
      md.addNewline();
    }

    for (const item of result.data.claimed) {
      const rewardText = item.rewards.length > 0 ? item.rewards.map(reward => `${reward.name}×${reward.amount}`).join('、') : '无';

      md.addText(`🎯 ${item.requiredPoints}点：${rewardText}`);
      md.addNewline();
    }

    if (result.data.partial && result.data.error) {
      md.addText(`剩余奖励领取失败：${result.data.error}`);
    }
    void message.send(FormatGui({ isPrivate, bid, title, content: md, footer: [{ label: '返回', command: backCommand }] }));
  } catch {
    await renderFailure('一键领取失败，请稍后再试。');
  }
});
