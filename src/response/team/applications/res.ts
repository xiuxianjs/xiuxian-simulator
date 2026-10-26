import { useMessage } from '@src/utils/useMessage';
/**
 * 队伍申请列表
 * 指令：队伍申请
 */

import type { TeamApplicationsResult } from '@src/response-apps/team/applications/app';
import { parseBackendTeamPendingApplications } from '@src/api/bot/queries';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { teamRecoveryTips } from '@src/response/teamRecovery';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?(处理)?队伍申请$/;
  const messageText = e.MessageText || '';

  if (!regex.test(messageText)) {
    return;
  }

  const back = [{ label: '我的队伍', command: '/我的队伍' }];
  let result: TeamApplicationsResult;

  try {
    const loaded = await runRobotBusiness(
      e,
      'teams.applications',
      {},
      (value): TeamApplicationsResult => {
        if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') {
          return { code: 'LOAD_FAILED', data: { message: value.error } };
        }

        return { code: 'OK', data: parseBackendTeamPendingApplications(value) };
      },
      next
    );

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch (error) {
    logger.error('查询队伍申请失败:', error);
    result = { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '查询失败' } };
  }

  if (result.code !== 'OK') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);
    appendMiddlewareAdvice(md, teamRecoveryTips('teams.applications', result.data.message));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: back }));

    return;
  }

  if (result.data.applications.length === 0) {
    const md = Format.createMarkdown();

    md.addText('暂无入队申请');

    void message.send(FormatGui({ isPrivate, bid, title: '队伍申请', content: md, footer: back }));

    return;
  }

  const md = Format.createMarkdown();

  for (const app of result.data.applications) {
    md.addText(`【${app.userId}】${app.userName}`);

    addOptions(md, [
      { label: '同意', command: `/队伍同意 ${app.id}` },
      { label: '拒绝', command: `/队伍拒绝 ${app.id}` }
    ]);
  }

  void message.send(FormatGui({ isPrivate, bid, title: `【${result.data.leaderName}】的队伍`, content: md, footer: back }));
});
