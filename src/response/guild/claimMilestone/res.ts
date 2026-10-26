import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildMilestoneClaim } from '@src/api/bot/guild-claims-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const title = '';
  const footer = undefined;
  const msg = e.MessageText?.trim() || '';
  const match = msg.match(/领取宗门日活奖励\s+(\d+)/) ?? msg.match(/领取宗门周活奖励\s+(\d+)/);
  const args = { milestoneArg: match?.[1] ?? '' };
  const send = (text: string) => message.send(FormatGui({ isPrivate, bid, title, content: Format.createMarkdown().addText(text), footer }));

  try {
    const loaded = await runRobotBusiness(
      e,
      'guild.milestone-claim',
      args,
      value => parseRobotGuildMilestoneClaim(value, Number(args.milestoneArg)),
      next,
      async reply => {
        await send(reply.text);
      }
    );

    if (loaded.handled) {
      return;
    }
    if (!args.milestoneArg) {
      await message.send(
        FormatGui({
          isPrivate,
          bid,
          title,
          content: Format.createMarkdown().addText(loaded.data.message),
          footer: [{ label: '查看奖励编号与条件', command: msg.includes('周活') ? '/宗门周常' : '/宗门日常' }]
        })
      );

      return;
    }
    void send(loaded.data.message);
  } catch (error) {
    logger.error('宗门领奖指令失败:', error);
    await send('领取失败，请稍后再试。');
  }
});
