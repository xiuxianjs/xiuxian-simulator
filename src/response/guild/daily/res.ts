import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildDaily } from '@src/api/bot/guild-daily-robot-query';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
/**
 * 宗门日常指令
 * 指令格式：/宗门日常 或 /宗门任务
 * 展示宗门日常任务进度和日活跃度里程碑奖励
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    const loaded = await runRobotBusiness(e, 'guild.daily', {}, parseRobotGuildDaily, next, async reply => {
      await message.send(
        FormatGui({
          isPrivate,
          bid,
          title: reply.title,
          content: Format.createMarkdown().addText(reply.text),
          footer: reply.buttons.length ? reply.buttons : undefined
        })
      );
    });

    if (loaded.handled) {
      return;
    }
    const appResult = loaded.data;

    const { guildName, dailyActivity, dailyActivityMax, contributionPoints, dailyTasks, claimAllAvailable, milestones } = appResult.data;

    // 组装展示
    const md = Format.createMarkdown();

    md.addText(`贡献点：${contributionPoints}`);
    md.addNewline();
    md.addText(`活跃度：${dailyActivity}/${dailyActivityMax}`);
    md.addNewline();

    const taskCommands = {
      checkin: '/宗门签到',
      mining: '/宗门采矿',
      exchange: '',
      worship: '/祭祀祖师',
      storyline: '/宗门主线'
    } as const;

    for (const task of dailyTasks) {
      md.addText(task.line);
      const command = taskCommands[task.key];

      if (task.actionAvailable && command) {
        addOptions(md, [{ label: task.actionLabel, command }]);
      } else {
        md.addNewline();
      }
    }

    if (milestones.length > 0) {
      md.addNewline();
      md.addText('【活跃度奖励】');
      md.addNewline();

      for (const m of milestones) {
        const status = m.claimed ? '✅' : m.canClaim ? '🔓' : '🔒';

        md.addText(`${status}${m.threshold}点→${m.description}`);

        if (m.canClaim) {
          addOptions(md, [{ label: '领取', command: `/领取宗门日活奖励 ${m.id}` }]);
        } else {
          md.addNewline();
        }
      }
    }

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: `【${guildName}】宗门日常`,
        header: [
          { label: '宗门日常', selected: true, command: '/宗门日常' },
          { label: '宗门周常', command: '/宗门周常' }
        ],
        content: md,
        footer: [
          ...(claimAllAvailable ? [{ label: '一键领取', command: '/一键领取宗门日活奖励' }] : []),
          { label: '商店', command: '/宗门商店' },
          { label: '俸禄', command: '/领取宗门俸禄' },
          { label: '宗门首页', command: '/我的宗门' }
        ]
      })
    );
  } catch (error: any) {
    logger.error('宗门日常指令处理失败:', error);
    const md = Format.createMarkdown();

    md.addText(error?.message ?? '获取宗门日常失败，请稍后再试或联系运营。');

    void message.send(FormatGui({ isPrivate, bid, title: '宗门日常', content: md }));
  }
});
