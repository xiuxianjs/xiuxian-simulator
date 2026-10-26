import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { emailRecoveryTips } from '@src/response/emailRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseEmailDeleteAll } from '@src/api/bot/email-actions-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const render = async (result: { code: 'EMPTY'; displayMsg: string } | { code: 'DELETED'; deleted: number }) => {
    const md = Format.createMarkdown();

    if (result.code === 'EMPTY') {
      md.addText(result.displayMsg);
      md.addNewline();
      md.addBlockquote(Format.createMarkdown().addText('仅可删除：已读无附件 或 已领取的邮件'));
    } else {
      md.addText(`成功删除 ${result.deleted} 封邮件！`);
    }

    md.addNewline();
    md.addButton(markdownButtonLabel('返回邮件列表'), { data: '/我的邮件' });

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '一键删除邮件',
        content: md
      })
    );
  };
  const loaded = await runRobotBusiness(
    e,
    'emails.delete-all',
    {},
    parseEmailDeleteAll,
    next,
    adviceRenderer(async reply => {
      await sendMiddlewareReply(e, { ...reply, title: '一键删除邮件' });
    })
  ).catch(async () => {
    await sendMiddlewareReply(e, {
      title: '一键删除邮件',
      heading: '',
      text: '删除结果未获完整确认，请先查看邮件状态',
      buttons: [],
      advice: emailRecoveryTips('emails.delete-all', '删除未确认')
    });

    return { handled: true as const };
  });

  if (!loaded.handled) {
    await render({ code: 'DELETED', deleted: loaded.data.deleted });
  }
});
