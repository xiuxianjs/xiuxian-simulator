import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotMarketMessage } from '@src/api/bot/market-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = (e.MessageText ?? '').trim();
  const m = text.match(/店铺简介\s+(.+)/);
  const sendFailure = async (text: string, reply?: RobotMiddlewareReply) => {
    const md = Format.createMarkdown().addText(text);

    if (reply?.quote) {
      md.addNewline();
      md.addBlockquote(Format.createMarkdown().addText(reply.quote));
    }
    const footer = reply?.buttons.length
      ? reply.buttons.map(button => ({ label: button.label, command: button.command }))
      : [{ label: '我的小店', command: '/我的小店' }];

    await message.send(FormatGui({ isPrivate, bid, title: '店铺简介', content: md, footer }));
  };
  let loaded;

  try {
    loaded = await runRobotBusiness(
      e,
      'player-shop.description',
      { description: m?.[1]?.trim() ? m[1].trim() : null },
      parseRobotMarketMessage,
      next,
      async reply => {
        await sendFailure(reply.text, reply);
      }
    );
  } catch {
    await sendFailure('更新简介失败，请稍后再试');

    return;
  }
  if (loaded.handled) {
    return;
  }

  const md = Format.createMarkdown().addText(loaded.data.message);

  void message.send(FormatGui({ isPrivate, bid, title: '店铺简介', content: md, footer: [{ label: '我的小店', command: '/我的小店' }] }));
});
