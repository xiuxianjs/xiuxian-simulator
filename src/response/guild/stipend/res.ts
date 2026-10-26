import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildStipend } from '@src/api/bot/guild-claims-robot-query';
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
  const args = {};
  const send = (text: string) => message.send(FormatGui({ isPrivate, bid, title, content: Format.createMarkdown().addText(text), footer }));

  try {
    const loaded = await runRobotBusiness(e, 'guild.stipend-claim', args, parseRobotGuildStipend, next, async reply => {
      await send(reply.text);
    });

    if (loaded.handled) {
      return;
    }
    void send(loaded.data.message);
  } catch (error) {
    logger.error('宗门领奖指令失败:', error);
    await send(error instanceof Error ? error.message : '领取奖励失败');
  }
});
