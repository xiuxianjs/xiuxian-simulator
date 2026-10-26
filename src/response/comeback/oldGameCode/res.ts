import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { giftCodeRecoveryTips } from '@src/response/giftCodeRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotOldGameCode } from '@src/api/bot/gift-code-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = isPrivateEvent(e);
  const md = Format.createMarkdown();
  const [, next] = useEvent();
  const renderFailure = async (text: string) => {
    const content = Format.createMarkdown();

    content.addText(text);
    appendMiddlewareAdvice(content, giftCodeRecoveryTips('gift-codes.old-game-issue', text));

    await message.send(FormatGui({ isPrivate, bid, title: '凡人修仙礼包码', content }));
  };
  let giftCode: string;

  try {
    const loaded = await runRobotBusiness(
      e,
      'gift-codes.old-game-issue',
      {},
      parseRobotOldGameCode,
      next,
      adviceRenderer(reply => sendMiddlewareReply(e, { ...reply, title: '凡人修仙礼包码' }))
    );

    if (loaded.handled) {
      return;
    }
    giftCode = loaded.data.giftCode;
  } catch (error) {
    await renderFailure(error instanceof Error ? error.message : '当前无法获取凡人修仙礼包码，请稍后再试');

    return;
  }
  // 能成功，但不私聊的话，可能会被盗取，所以提示用户私聊获取礼包码
  if (!isPrivate) {
    md.addText('为保障您的礼包码不被盗取，请私聊发送指令获取礼包码');
    appendMiddlewareAdvice(md, giftCodeRecoveryTips('gift-codes.old-game-issue', '请私聊获取'));

    void message.send(FormatGui({ isPrivate, bid, title: '凡人修仙礼包码', content: md }));

    return;
  }

  {
    md.addText(`你的凡人修仙礼包码：${giftCode}`);
    md.addButton(markdownButtonLabel('立即兑换'), { data: `/礼包码 ${giftCode}` });

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '凡人修仙礼包码',
        content: md
      })
    );
  }
});
