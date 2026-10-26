import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { useMessage } from '@src/utils/useMessage';
/**
 * 取消队伍申请
 * 指令：取消队伍申请 [申请ID]
 */

import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { teamRecoveryTips } from '@src/response/teamRecovery';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotTeamApplicationCancel, type RobotTeamApplicationCancelResult } from '@src/api/bot/team-application-cancel-result';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?取消队伍申请\s*(\d+)?$/;
  const messageText = e.MessageText || '';
  const match = messageText.match(regex);

  if (!match) {
    return;
  }
  const applicationIdStr = match[2];

  const applicationId = applicationIdStr ? Number(applicationIdStr).toString() : '';
  let result: RobotTeamApplicationCancelResult;

  try {
    const loaded = await runRobotBusiness(e, 'teams.application-cancel', { applicationId }, parseRobotTeamApplicationCancel, next);

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch (error) {
    logger.error('取消队伍申请失败:', error);
    result = { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '取消申请失败，请稍后再试' } };
  }

  if (result.code === 'NO_PENDING') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);
    appendMiddlewareAdvice(md, teamRecoveryTips('teams.application-cancel', result.data.message));

    void message.send(FormatGui({ isPrivate, bid, title: '无待处理申请', content: md }));

    return;
  }

  if (result.code === 'LIST') {
    const md = Format.createMarkdown();

    md.addText(`您有 ${result.data.applications.length} 个待审核的申请`);
    md.addNewline();
    md.addText('');
    md.addNewline();

    for (let i = 0; i < result.data.applications.length; i++) {
      const app = result.data.applications[i];

      md.addText(`**【${i + 1}】${app.leaderName}的队伍**`);
      md.addNewline();
      md.addText(`申请编号：${app.id}`);
      md.addButton(markdownButtonLabel('取消此申请'), { data: `/取消队伍申请 ${app.id}` });
      md.addNewline();

      if (i < result.data.applications.length - 1) {
        md.addText('');
        md.addNewline();
      }
    }

    md.addNewline();
    md.addText('**使用说明：**');
    md.addNewline();
    md.addText('输入 /取消队伍申请 申请编号 来取消申请');
    md.addNewline();
    md.addText('请使用上方本人待审核申请的真实编号');

    void message.send(FormatGui({ isPrivate, bid, title: '待处理的申请', content: md }));

    return;
  }

  if (result.code === 'CANCEL_OK') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);
    appendMiddlewareAdvice(md, teamRecoveryTips('teams.application-cancel', result.data.message));
    md.addNewline();
    md.addText('');
    md.addNewline();
    md.addText('您可以继续申请其他队伍');

    void message.send(FormatGui({ isPrivate, bid, title: '✅ 取消成功', content: md }));

    return;
  }

  if (result.code === 'CANCEL_FAILED') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);
    appendMiddlewareAdvice(md, teamRecoveryTips('teams.application-cancel', result.data.message));
    md.addNewline();
    md.addText('');
    md.addNewline();
    md.addText('可能的原因：');
    md.addNewline();
    md.addText('• 申请编号不存在');
    md.addNewline();
    md.addText('• 申请已被处理');
    md.addNewline();
    md.addText('• 申请不属于您');
    md.addNewline();
    md.addText('');
    md.addNewline();
    md.addText('使用 ');
    md.addButton(markdownButtonLabel('查看我的申请'), { data: '/我的队伍申请' });
    md.addText(' 查看您的申请列表');

    void message.send(FormatGui({ isPrivate, bid, title: '取消失败', content: md }));

    return;
  }

  const md = Format.createMarkdown();

  md.addText(result.data.message);

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
