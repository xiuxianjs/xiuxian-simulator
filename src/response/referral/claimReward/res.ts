import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { referralRecoveryTips } from '@src/response/referralRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotReferralClaim } from '@src/api/bot/referral-actions-robot-query';
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
    appendMiddlewareAdvice(content, referralRecoveryTips('referral.claim', text));
    await message.send(FormatGui({ isPrivate, bid, title: '领取邀请奖励', content, footer: [{ label: '邀请码', command: '/邀请码' }] }));
  };
  let result: ReturnType<typeof parseRobotReferralClaim>;

  try {
    const loaded = await runRobotBusiness(
      e,
      'referral.claim',
      {},
      parseRobotReferralClaim,
      next,
      adviceRenderer(reply => sendMiddlewareReply(e, { ...reply, title: '领取邀请奖励', buttons: [...reply.buttons, { label: '邀请码', command: '/邀请码' }] }))
    );

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch {
    await renderFailure('领取失败，请稍后再试');

    return;
  }
  const md = Format.createMarkdown();

  md.addText(result.displayMsg);

  if (result.rewards.length > 0) {
    md.addNewline();
    md.addNewline();

    for (const reward of result.rewards) {
      md.addText(reward);
      md.addNewline();
    }
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '领取邀请奖励',
      content: md,
      footer: [{ label: '邀请码', command: '/邀请码' }]
    })
  );
});
