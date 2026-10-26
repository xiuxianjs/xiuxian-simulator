import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendTeamMatchStart } from '@src/api/bot/team-match-start';
import { useMessage } from '@src/utils/useMessage';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const match = (e.MessageText ?? '').trim().match(/^(!|！|\/|#|＃)?匹配主线(?:\s+([\s\S]*))?$/);

  const [, next] = useEvent();
  const renderFailure = async (text: string, advice: RobotMiddlewareReply['advice'] = [], buttons: RobotMiddlewareReply['buttons'] = []) => {
    const content = Format.createMarkdown();

    content.addText(text);
    appendMiddlewareAdvice(content, advice);
    await message.send(FormatGui({ isPrivate, bid, title: '副本匹配', content, footer: buttons }));
  };
  let loaded: Awaited<ReturnType<typeof runRobotBusiness<ReturnType<typeof parseBackendTeamMatchStart>>>>;

  try {
    loaded = await runRobotBusiness(
      e,
      'team-match.start-mainline',
      { input: String(match?.[2] ?? '').trim() },
      parseBackendTeamMatchStart,
      next,
      adviceRenderer(reply => renderFailure(reply.text, reply.advice, reply.buttons))
    );
    if (loaded.handled) {
      return;
    }
  } catch (error) {
    await renderFailure(error instanceof Error ? error.message : '发起匹配失败');

    return;
  }
  const md = Format.createMarkdown();

  md.addText('已进入匹配');
  md.addNewline();
  md.addText(`目标：${loaded.data.targetLabel}`);
  md.addNewline();
  md.addText('匹配时限：3分钟');
  md.addNewline();
  md.addText('当前优先匹配同大境界修士');
  const footer = [
    { label: '匹配状态', command: '/匹配状态' },
    { label: '取消匹配', command: '/取消匹配' }
  ];

  void message.send(FormatGui({ isPrivate, bid, title: '副本匹配', content: md, footer }));
});
