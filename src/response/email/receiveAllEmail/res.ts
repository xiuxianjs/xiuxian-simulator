import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { emailRecoveryTips } from '@src/response/emailRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseEmailClaimAll } from '@src/api/bot/email-actions-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const render = async (result: { code: 'NO_MAIL' | 'ALL_CLAIMED'; displayMsg: string } | { code: 'OK'; claimed: number; skipped: number }) => {
    const md = Format.createMarkdown();

    if (result.code !== 'OK') {
      md.addText(result.displayMsg);
    } else {
      md.addText(`成功领取 ${result.claimed} 封邮件的附件！`);

      if (result.skipped > 0) {
        md.addNewline();
        md.addText(`${result.skipped} 封未领取成功，请先核对邮件状态`);
        appendMiddlewareAdvice(md, emailRecoveryTips('emails.claim-all', '部分领取未完成'));
      }

      md.addNewline();
      md.addText('物品已添加到背包');
    }

    const footer =
      result.code === 'OK'
        ? [
            { label: '返回邮件列表', command: '/我的邮件' },
            { label: '储物袋', command: '/储物袋' }
          ]
        : [{ label: '返回邮件列表', command: '/我的邮件' }];

    await message.send(FormatGui({ isPrivate, bid, title: '一键领取邮件', content: md, footer }));
  };
  const loaded = await runRobotBusiness(
    e,
    'emails.claim-all',
    {},
    parseEmailClaimAll,
    next,
    adviceRenderer(async reply => {
      await sendMiddlewareReply(e, { ...reply, title: '一键领取邮件' });
    })
  ).catch(async () => {
    await sendMiddlewareReply(e, {
      title: '一键领取邮件',
      heading: '',
      text: '领取结果未获完整确认，请先查看邮件状态',
      buttons: [],
      advice: emailRecoveryTips('emails.claim-all', '领取未确认')
    });

    return { handled: true as const };
  });

  if (!loaded.handled) {
    await render({ code: 'OK', claimed: loaded.data.claimed, skipped: loaded.data.skipped });
  }
});
