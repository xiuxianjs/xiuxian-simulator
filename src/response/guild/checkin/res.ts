import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildCheckin } from '@src/api/bot/guild-daily-robot-query';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const feedback = async (reply: RobotMiddlewareReply) => {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: reply.title,
        content: Format.createMarkdown().addText(reply.text),
        footer: reply.buttons.length ? reply.buttons : undefined
      })
    );
  };

  try {
    const loaded = await runRobotBusiness(e, 'guild.checkin', {}, parseRobotGuildCheckin, next, feedback);

    if (loaded.handled) {
      return;
    }
    void message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(loaded.data.data.message) }));
  } catch (error) {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(error instanceof Error ? error.message : '签到失败') }));
  }
});
