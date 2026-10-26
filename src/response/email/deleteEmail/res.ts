import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { emailRecoveryTips } from '@src/response/emailRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { emailActionArguments, emailDeleteDecoder } from '@src/api/bot/email-actions-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const id = e.MessageText.replace(/^(!|！|\/|#|＃)?删除邮件/, '').trim();
  const [, next] = useEvent();
  const args = emailActionArguments(e.MessageText, '删除邮件');
  const feedback = adviceRenderer(reply => sendMiddlewareReply(e, { ...reply, title: '删除邮件' }));
  const loaded = await runRobotBusiness(e, 'emails.delete', args, emailDeleteDecoder(args.emailId ?? NaN), next, feedback).catch(async () => {
    await sendMiddlewareReply(e, {
      title: '删除邮件',
      heading: '',
      text: '删除结果未获完整确认，请先查看邮件状态',
      buttons: [],
      advice: emailRecoveryTips('emails.delete', '删除未确认')
    });

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const result = loaded.data;

  if (result.code === 'CONFIRM') {
    const md = Format.createMarkdown();

    md.addBlockquote(
      Format.createMarkdown()
        .addText(`删除邮件 ${id} · ${result.expiresInSeconds}秒内有效 `)
        .addButton(markdownButtonLabel('确认删除'), {
          data: `/删除邮件 ${id}`
        })
    );

    void message.send(FormatGui({ isPrivate, bid, title: '删除邮件', content: md }));

    return;
  }

  const md = Format.createMarkdown();

  md.addText('删除完成');

  void message.send(FormatGui({ isPrivate, bid, title: '删除邮件', content: md }));
});
