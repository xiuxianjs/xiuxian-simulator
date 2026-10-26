import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { referralRecoveryTips } from '@src/response/referralRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * /绑定邀请码 <code> - 新人绑定邀请码
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { referralBindArguments, parseRobotReferralBind } from '@src/api/bot/referral-actions-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const renderFailure = async (text: string) => {
    const content = Format.createMarkdown();

    content.addText(text);
    appendMiddlewareAdvice(content, referralRecoveryTips('referral.bind', text));
    await message.send(FormatGui({ isPrivate, bid, title: '绑定邀请码', content }));
  };
  let result: ReturnType<typeof parseRobotReferralBind>;

  try {
    const loaded = await runRobotBusiness(
      e,
      'referral.bind',
      referralBindArguments(e.MessageText ?? ''),
      parseRobotReferralBind,
      next,
      adviceRenderer(reply => sendMiddlewareReply(e, { ...reply, title: '绑定邀请码' }))
    );

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch {
    await renderFailure('绑定失败，请稍后再试');

    return;
  }

  switch (result.code) {
    case 'NO_CODE': {
      const md = Format.createMarkdown();

      md.addText('请输入邀请码');
      md.addNewline();
      md.addText('格式：/绑定邀请码 tt-用户ID');
      appendMiddlewareAdvice(md, referralRecoveryTips('referral.bind', '请输入邀请码'));

      void message.send(FormatGui({ isPrivate, bid, title: '绑定邀请码', content: md }));

      return;
    }

    case 'SUCCESS': {
      const md = Format.createMarkdown();

      md.addText(result.displayMsg);

      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '绑定邀请码',
          content: md,
          footer: result.showBar ? [{ label: '邀请码', command: '/邀请码' }] : undefined
        })
      );
    }
  }
});
