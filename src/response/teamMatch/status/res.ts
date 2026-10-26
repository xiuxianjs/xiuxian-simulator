import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { teamMatchRecoveryTips } from '@src/response/teamMatchRecovery';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendTeamMatchSnapshot } from '@src/api/bot/team-match-queries';
import { useMessage } from '@src/utils/useMessage';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  if (!/^(!|！|\/|#|＃)?匹配状态$/.test(e.MessageText || '')) {
    return;
  }

  const [, next] = useEvent();
  const renderFailure = async (text: string, advice: RobotMiddlewareReply['advice'] = [], buttons: RobotMiddlewareReply['buttons'] = []) => {
    const content = Format.createMarkdown();

    content.addText(text);
    appendMiddlewareAdvice(content, advice);
    await message.send(FormatGui({ isPrivate, bid, title: '副本匹配', content, footer: buttons }));
  };
  let loaded: Awaited<ReturnType<typeof runRobotBusiness<ReturnType<typeof parseBackendTeamMatchSnapshot>>>>;

  try {
    loaded = await runRobotBusiness(
      e,
      'team-match.snapshot',
      {},
      parseBackendTeamMatchSnapshot,
      next,
      adviceRenderer(reply => renderFailure(reply.text, reply.advice, reply.buttons))
    );
    if (loaded.handled) {
      return;
    }
  } catch (error) {
    await renderFailure(error instanceof Error ? error.message : '查询匹配状态失败');

    return;
  }
  const md = Format.createMarkdown();
  let footer: { label: string; command: string }[] | undefined;
  const data = loaded.data;

  if (data === null) {
    md.addText('当前未查到有效匹配记录');
    appendMiddlewareAdvice(md, teamMatchRecoveryTips('team-match.snapshot', '当前未查到有效匹配记录'));
  } else {
    md.addText('状态：匹配中');
    md.addNewline();
    md.addText(`目标：${data.targetLabel}`);
    md.addNewline();
    md.addText(`已等待：${data.waitedSeconds}秒`);
    md.addNewline();
    md.addText(
      `当前策略：${
        {
          WAITING: '等待同目标修士进入匹配池',
          SAME_REALM: '仅匹配同大境界修士',
          ADJACENT_REALM: '优先同大境界，其次相邻大境界',
          NEAREST_REALM: '放宽到同目标副本的最近大境界修士'
        }[data.phase]
      }`
    );
    md.addNewline();
    md.addText(`时限：${data.timeoutSeconds}秒`);
    if (data.waitedSeconds >= data.timeoutSeconds) {
      md.addNewline().addText('已达到提示时限，请核对当前队伍与服务端通知');
      appendMiddlewareAdvice(md, teamMatchRecoveryTips('team-match.snapshot', '已达到提示时限'));
    }
    footer = [{ label: '取消匹配', command: '/取消匹配' }];
  }

  void message.send(FormatGui({ isPrivate, bid, title: '副本匹配', content: md, footer }));
});
