import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { masterRecoveryTips } from '@src/response/masterRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseMasterDecision } from '@src/api/bot/master-actions';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = e.MessageText?.trim() ?? '';
  const match = text.match(/^[!！/#＃]?同意出师(?:\s+(.+))?$/);
  const discipleArg = match?.[1]?.trim();

  let result: ReturnType<typeof parseMasterDecision>;

  try {
    const loaded = await runRobotBusiness(e, 'master.graduation-accept', { discipleArg: discipleArg ?? '' }, parseMasterDecision, next);

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch (error) {
    void message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(error instanceof Error ? error.message : '操作失败') }));

    return;
  }

  if (result.outcome === 'list') {
    const md = Format.createMarkdown();

    md.addBold('【出师申请】');
    md.addNewline();
    if (result.received.length === 0) {
      md.addText('暂无待处理的出师申请');
      md.addNewline().addButton(markdownButtonLabel('查看我的师门'), { data: '/我的师门' });
    } else {
      md.addText('待处理的出师申请：');
      md.addNewline();
      result.received.forEach((proposal, index) => {
        md.addText(`【${index + 1}】${proposal.fromName}`);
        md.addNewline();
        md.addBlockquote(
          addOptions(Format.createMarkdown().addText(`UID：${proposal.fromUserId}`).addNewline().addText(`${proposal.fromRealm}`), [
            { label: '同意出师', command: `/同意出师 ${proposal.fromUserId}` },
            { label: '拒绝出师', command: `/拒绝出师 ${proposal.fromUserId}` }
          ])
        );
      });
    }

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  const md = Format.createMarkdown();

  md.addText(result.message);
  appendMiddlewareAdvice(md, masterRecoveryTips('master.graduation-accept', result.message));

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
