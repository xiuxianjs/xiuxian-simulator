import { useMessage } from '@src/utils/useMessage';
/**
 * 提升宗门等级
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildUpgrade } from '@src/api/bot/guild-upgrade-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

function appendFormattedMessage(md: ReturnType<typeof Format.createMarkdown>, text: string) {
  const paragraphs = text.split('\n').flatMap(line => line
      .split(/(?<=[。；])/)
      .map(part => part.trim())
      .filter(Boolean)
  );

  paragraphs.forEach((line, index) => {
    md.addText(line);
    if (index < paragraphs.length - 1) {
      md.addNewline();
    }
  });
}

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const sendText = async (text: string) => {
    const md = Format.createMarkdown();

    appendFormattedMessage(md, text);
    await message.send(FormatGui({ isPrivate, bid, title: '宗门升级', content: md }));
  };

  try {
    const loaded = await runRobotBusiness(
      e,
      'guild.upgrade-level',
      {},
      value => parseRobotGuildUpgrade(value, 'level'),
      next,
      async reply => {
        await sendText(reply.text);
      }
    );

    if (loaded.handled) {
      return;
    }
    await sendText(loaded.data.message);
  } catch (error) {
    await sendText(error instanceof Error ? error.message : '升级失败');
  }
});
