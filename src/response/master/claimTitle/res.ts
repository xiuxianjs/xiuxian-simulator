import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { masterRecoveryTips } from '@src/response/masterRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseMasterClaimTitle } from '@src/api/bot/master-actions';
import { BackendAPIError } from '@src/api/bot/client';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const send = async (
    text: string,
    advice: RobotMiddlewareReply['advice'] = masterRecoveryTips('master.title-claim', text),
    buttons: RobotMiddlewareReply['buttons'] = []
  ) => {
    const content = Format.createMarkdown().addText(text);

    appendMiddlewareAdvice(content, advice);
    await message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid: e.UserId,
        title: '领取师门称号',
        content,
        footer: [{ label: '我的师门', command: '/我的师门' }, { label: '我的称号', command: '/我的称号' }, ...buttons]
      })
    );
  };

  try {
    const result = await runRobotBusiness(
      e,
      'master.title-claim',
      {},
      parseMasterClaimTitle,
      next,
      adviceRenderer(reply => send(reply.text, reply.advice, reply.buttons))
    );

    if (result.handled) {
      return;
    }
    await send('「桃李满天下」称号已发放至你的称号列表，可前往我的称号进行佩戴。');
  } catch (error) {
    await send(error instanceof BackendAPIError && error.code === 'IDEMPOTENCY_IN_PROGRESS' ? '操作繁忙，请稍后再试。' : '领取失败，请稍后再试。');
  }
});
