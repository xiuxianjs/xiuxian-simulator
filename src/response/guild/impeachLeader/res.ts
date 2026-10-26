import { useMessage } from '@src/utils/useMessage';
/**
 * 弹劾宗主
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildImpeach } from '@src/api/bot/guild-leadership-end-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  const sendText = async (text: string) => {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));
  };

  try {
    const loaded = await runRobotBusiness(e, 'guild.impeach', {}, parseRobotGuildImpeach, next, async reply => {
      await sendText(reply.text);
    });

    if (loaded.handled) {
      return;
    }
    await sendText(loaded.data.message);
  } catch (error) {
    await sendText(error instanceof Error ? error.message : '弹劾失败');
  }
});
