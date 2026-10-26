import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { masterRecoveryTips } from '@src/response/masterRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseApplyMasterCommand, masterMentionBid } from '@src/utils/masterCommand';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseMasterTargetAction } from '@src/api/bot/master-actions';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useMention, useEvent } from 'alemonjs';

const isPendingMasterApplyMessage = (message: string) => message.includes('等待对方同意') || message.includes('请等待回应');

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const [mention] = useMention();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const send = async (
    text: string,
    usage = false,
    advice: RobotMiddlewareReply['advice'] = masterRecoveryTips('master.apply', text),
    buttons: RobotMiddlewareReply['buttons'] = []
  ) => {
    const md = Format.createMarkdown().addText(text);

    if (isPendingMasterApplyMessage(text)) {
      md.addNewline();
      addOptions(md, [{ label: '我的师门', command: '/我的师门' }]);
    }
    appendMiddlewareAdvice(md, advice);
    await message.send(FormatGui({ isPrivate, bid, title: usage ? '【拜师】' : '', content: md, footer: buttons }));
  };
  const targetBid = await masterMentionBid(mention);

  try {
    const result = await runRobotBusiness(
      e,
      'master.apply',
      { targetArg: parseApplyMasterCommand(e.MessageText || '') ?? '', ...(targetBid ? { targetBid } : {}) },
      value => parseMasterTargetAction(value, '拜师'),
      next,
      adviceRenderer(reply => send(reply.text, false, reply.advice, reply.buttons))
    );

    if (result.handled) {
      return;
    }
    if (result.data.outcome === 'usage') {
      await send('使用方法：拜师 <师父UID|@目标>', true);

      return;
    }
    await send(result.data.message);
  } catch (error) {
    await send(error instanceof Error ? error.message : '拜师申请失败');
  }
});
