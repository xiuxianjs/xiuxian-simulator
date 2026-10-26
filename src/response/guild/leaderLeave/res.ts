import { useMessage } from '@src/utils/useMessage';
/**
 * 宗主请假（固定3天）
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildLeaderLeave } from '@src/api/bot/guild-leave-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    const loaded = await runRobotBusiness(e, 'guild.leader-leave', {}, parseRobotGuildLeaderLeave, next, async reply => {
      await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(reply.text) }));
    });

    if (loaded.handled) {
      return;
    }
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(loaded.data.message) }));
  } catch (error) {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(error instanceof Error ? error.message : '请假失败') }));
  }
});
