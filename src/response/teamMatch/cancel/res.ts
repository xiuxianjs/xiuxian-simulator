import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { teamMatchRecoveryTips } from '@src/response/teamMatchRecovery';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendTeamMatchCancel } from '@src/api/bot/team-match-cancel';
import { useMessage } from '@src/utils/useMessage';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  if (!/^(!|！|\/|#|＃)?取消匹配$/.test(e.MessageText || '')) {
    return;
  }

  const [, next] = useEvent();
  const renderFailure = async (text: string, advice: RobotMiddlewareReply['advice'] = [], buttons: RobotMiddlewareReply['buttons'] = []) => {
    const content = Format.createMarkdown();

    content.addText(text);
    appendMiddlewareAdvice(content, advice);
    await message.send(FormatGui({ isPrivate, bid, title: '副本匹配', content, footer: buttons }));
  };
  let loaded: Awaited<ReturnType<typeof runRobotBusiness<ReturnType<typeof parseBackendTeamMatchCancel>>>>;

  try {
    loaded = await runRobotBusiness(
      e,
      'team-match.cancel',
      {},
      parseBackendTeamMatchCancel,
      next,
      adviceRenderer(reply => renderFailure(reply.text, reply.advice, reply.buttons))
    );
    if (loaded.handled) {
      return;
    }
  } catch (error) {
    await renderFailure(error instanceof Error ? error.message : '取消匹配失败');

    return;
  }
  const md = Format.createMarkdown();

  const text = loaded.data.cancelled ? `已取消匹配：${loaded.data.targetLabel}` : '本次未取消有效匹配记录';

  md.addText(text);
  appendMiddlewareAdvice(md, teamMatchRecoveryTips('team-match.cancel', text));

  void message.send(FormatGui({ isPrivate, bid, title: '副本匹配', content: md }));
});
