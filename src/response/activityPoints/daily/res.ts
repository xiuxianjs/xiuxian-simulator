import { useMessage } from '@src/utils/useMessage';
/**
 * 日常活跃指令响应
 * 查看日常活跃任务列表、进度和奖励
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotActivityPoints } from '@src/api/bot/activity-points-robot';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const renderFailure = async (text: string) => {
    const content = Format.createMarkdown().addText(text);

    await message.send(FormatGui({ isPrivate, bid, title: '日常活跃', content }));
  };

  try {
    const loaded = await runRobotBusiness(
      e,
      'activity-points.daily',
      {},
      value => parseRobotActivityPoints(value, 'daily'),
      next,
      reply => renderFailure(reply.text)
    );

    if (loaded.handled) {
      return;
    }
    const contentMd = Format.createMarkdown();
    const { currentPoints, tasks, rewards, taskRewardsCanClaim } = loaded.data;
    const claimable = rewards.filter(r => r.canClaim);

    // ── 活跃度总览 ────────────────────────
    contentMd.addText(`当前活跃度：${currentPoints}`);
    contentMd.addNewline();

    // ── 任务列表 ────────────────────────────
    if (tasks.length === 0) {
      contentMd.addText('暂无日常任务配置。');
      contentMd.addNewline();
    } else {
      for (const task of tasks) {
        const status = task.completed ? '◆' : '◇';
        const progress = `${task.currentValue}/${task.targetValue}`;

        contentMd.addText(`${status} ${task.name}（${progress}）+${task.activityPoints}活跃`);
        contentMd.addNewline();
      }
    }

    // ── 奖励列表 ────────────────────────────
    if (rewards.length > 0) {
      contentMd.addNewline();
      contentMd.addText('── 活跃度奖励 ──');
      contentMd.addNewline();

      for (const points of [...new Set(rewards.map(reward => reward.requiredPoints))].sort((a, b) => a - b)) {
        const rows = rewards.filter(reward => reward.requiredPoints === points);
        const canClaim = rows.some(reward => reward.canClaim);
        const claimed = rows.every(reward => reward.claimed);
        const status = canClaim ? '🔓' : claimed ? '✅' : '🔒';
        const rewardNames = rows.map(reward => `${reward.name} x${reward.quantity}`);

        contentMd.addText(`${status}${points}点 → ${rewardNames.join('、')}`);

        if (canClaim) {
          addOptions(contentMd, [{ label: '领取', command: `/领取日常活跃奖励 ${points}`, autoEnter: false }]);
        } else {
          contentMd.addNewline();
        }
      }
    }

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '日常活跃',
        header: [
          { label: '日常活跃', selected: true, command: '/日常活跃', autoEnter: false },
          { label: '周常活跃', command: '/周常活跃', autoEnter: false }
        ],
        content: contentMd,
        footer: [
          ...(claimable.length > 0 || taskRewardsCanClaim ? [{ label: '一键领取', command: '/一键领取日常活跃奖励', autoEnter: false }] : []),
          { label: '签到', command: '/日常签到', autoEnter: false },
          { label: '更多', command: '/更多', autoEnter: false }
        ]
      })
    );
  } catch {
    const md = Format.createMarkdown();

    md.addText('查看日常活跃失败，请稍后再试。');

    void message.send(FormatGui({ isPrivate, bid, title: '日常活跃', content: md }));
  }
});
