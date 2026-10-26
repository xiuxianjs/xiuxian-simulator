import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { emailRecoveryTips } from '@src/response/emailRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { emailActionArguments, emailClaimDecoder } from '@src/api/bot/email-actions-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e.UserId,
    isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const args = emailActionArguments(e.MessageText, '领取邮件');
  const feedback = adviceRenderer(reply => sendMiddlewareReply(e, { ...reply, title: '领取邮件' }));
  const loaded = await runRobotBusiness(e, 'emails.claim', args, emailClaimDecoder(args.emailId ?? NaN), next, feedback).catch(async () => {
    await sendMiddlewareReply(e, {
      title: '领取邮件',
      heading: '',
      text: '领取结果未获完整确认，请先查看邮件状态',
      buttons: [],
      advice: emailRecoveryTips('emails.claim', '领取未确认')
    });

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  await message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '领取邮件',
      content: Format.createMarkdown().addText('领取成功！物品已添加到背包'),
      footer: [
        { label: '返回邮件列表', command: '/我的邮件' },
        { label: '储物袋', command: '/储物袋' }
      ]
    })
  );
});
