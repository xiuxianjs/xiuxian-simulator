import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildMilestonesClaimAll } from '@src/api/bot/guild-claims-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const msg = e.MessageText?.trim() || '';
  const isDaily = /^[!！/#＃]?(?:领取全部|一键领取)宗门日活奖励$/.test(msg);
  const isWeekly = /^[!！/#＃]?(?:领取全部|一键领取)宗门周活奖励$/.test(msg);

  if (!isDaily && !isWeekly) {
    return;
  }
  const args = { type: isDaily ? 'daily_activity' : 'weekly_activity' };
  const title = isDaily ? '宗门日常' : '宗门周常';
  const footer = [{ label: '返回', command: isDaily ? '/宗门日常' : '/宗门周常' }];
  const send = (text: string) => message.send(FormatGui({ isPrivate, bid, title, content: Format.createMarkdown().addText(text), footer }));

  try {
    const loaded = await runRobotBusiness(e, 'guild.milestone-claim-all', args, parseRobotGuildMilestonesClaimAll, next, async reply => {
      await send(reply.text);
    });

    if (loaded.handled) {
      return;
    }
    if (loaded.data.partial) {
      const md = Format.createMarkdown().addText(loaded.data.message);

      appendMiddlewareAdvice(md, [
        {
          command: isDaily ? '/宗门日常' : '/宗门周常',
          description: '已列出的奖励已经领取，后续失败不代表整批回滚；先核对原回执及当前剩余可领取项，不自动重新领取整批奖励'
        }
      ]);
      await message.send(FormatGui({ isPrivate, bid, title, content: md, footer }));

      return;
    }
    void send(loaded.data.message);
  } catch (error) {
    logger.error('宗门领奖指令失败:', error);
    await send(error instanceof Error ? error.message : '领取奖励失败');
  }
});
