import { useMessage } from '@src/utils/useMessage';
import { PAGE_SIZE } from '@src/constants';
import type { TeamListResult } from '@src/response-apps/team/teamList/app';
import { parseBackendTeams } from '@src/api/bot/queries';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { teamRecoveryTips } from '@src/response/teamRecovery';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?队伍列表(?:\s+(\d+))?$/;
  const messageText = e.MessageText ?? '';
  const match = messageText.match(regex);
  const page = match?.[2] ? Number(match[2]) : 1;

  const footer = [
    { label: '我的队伍', command: '/我的队伍' },
    { label: '我的申请', command: '/我的队伍申请' },
    { label: '我的邀请', command: '/我的队伍邀请' }
  ];
  let result: TeamListResult;

  try {
    const loaded = await runRobotBusiness(
      e,
      'teams.list',
      { page, pageSize: PAGE_SIZE },
      (value): TeamListResult => {
        return { code: 'OK', data: parseBackendTeams(value) };
      },
      next
    );

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch (error) {
    logger.error('查询队伍列表失败:', error);
    result = { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '查询失败' } };
  }

  if (result.code !== 'OK') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);
    appendMiddlewareAdvice(md, teamRecoveryTips('teams.list', result.data.message));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer }));

    return;
  }

  if (result.data.teams.length === 0) {
    const md = Format.createMarkdown();

    const reason = result.data.total > 0 ? '本页暂无队伍' : '暂无队伍';

    md.addText(reason);
    appendMiddlewareAdvice(md, teamRecoveryTips('teams.list', reason));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer }));

    return;
  }

  const md = Format.createMarkdown();

  for (const team of result.data.teams) {
    md.addBlockquote(
      createQuoteMarkdown(
        [`【${team.teamId}】${team.leaderName}的队伍`, `人数: ${team.memberCount}/${team.maxMembers}  门槛: ${team.minRealmName ?? '无'}`],
        [
          { label: '查看', command: `/队伍信息 ${team.teamId}` },
          { label: '申请', command: `/加入队伍 ${team.teamId}` }
        ]
      )
    );
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '队伍列表',
      content: md,
      nav: {
        current: result.data.currentPage,
        total: result.data.totalPages,
        command: '/队伍列表 {page}'
      },
      footer
    })
  );
});
