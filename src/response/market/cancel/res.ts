import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotMarketMessage } from '@src/api/bot/market-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

/**
 * 交易下架指令
 * - 指令格式：/交易下架 上架ID
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = (e.MessageText ?? '').trim();
  const m = text.match(/交易下架\s+(\d+)/);

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    await message.send(
      FormatGui({ isPrivate, bid, title: '珍宝楼', content: Format.createMarkdown().addText(text), footer: [{ label: '我的上架', command: '/我的上架' }] })
    );
  };
  let loaded;

  try {
    loaded = await runRobotBusiness(e, 'market.cancel', { listingId: m ? Number(m[1]) : null }, parseRobotMarketMessage, next, async reply => {
      await sendFailure(reply.text);
    });
  } catch (error) {
    await sendFailure(error instanceof Error ? error.message : '交易下架失败，请稍后再试');

    return;
  }
  if (loaded.handled) {
    return;
  }

  const md = Format.createMarkdown();
  const displayMsg = loaded.data.message;

  md.addText(displayMsg);
  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '珍宝楼',
      content: md,
      footer: [
        { label: '我的上架', command: '/我的上架' },
        { label: '珍宝楼', command: '/珍宝楼' }
      ]
    })
  );
});
