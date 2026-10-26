import { formatGameTime } from '@src/utils/gameTime';
import { PAGE_SIZE } from '@src/constants';
import { useMessage } from '@src/utils/useMessage';
import type { TeamBattleRecordsResult } from '@src/response-apps/team/battleRecords/app';
import { parseBackendTeamBattleRecords } from '@src/api/bot/queries';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { teamRecoveryTips } from '@src/response/teamRecovery';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const match = (e.MessageText ?? '').match(/^(!|！|\/|#|＃)?队伍战斗记录(?:\s+(\d+))?$/);
  const page = match?.[2] ? Number(match[2]) : 1;

  let result: TeamBattleRecordsResult;

  try {
    const loaded = await runRobotBusiness(
      e,
      'teams.battle-records',
      { page, pageSize: PAGE_SIZE },
      (value): TeamBattleRecordsResult => {
        return { code: 'OK', data: parseBackendTeamBattleRecords(value) };
      },
      next
    );

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch (error) {
    logger.error('查询队伍战斗记录失败:', error);
    result = { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '查询失败' } };
  }

  if (result.code !== 'OK') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);
    appendMiddlewareAdvice(md, teamRecoveryTips('teams.battle-records', result.data.message));

    void message.send(FormatGui({ isPrivate, bid, title: '队伍战斗记录', content: md }));

    return;
  }

  if (result.data.records.length === 0) {
    const md = Format.createMarkdown();

    const reason = result.data.total > 0 ? '本页暂无队伍战斗记录' : '暂无队伍战斗记录';

    md.addText(reason);
    appendMiddlewareAdvice(md, teamRecoveryTips('teams.battle-records', reason));

    void message.send(FormatGui({ isPrivate, bid, title: '队伍战斗记录', content: md }));

    return;
  }

  const md = Format.createMarkdown();

  for (const record of result.data.records) {
    md.addText(`【#${record.id}】${record.targetLabel}`);
    md.addNewline();
    md.addBlockquote(
      Format.createMarkdown()
        .addText(
          `队伍：${record.teamId}  结果：${record.battleResult === 'win' ? '胜利' : record.battleResult === 'lose' ? '失败' : '逃跑'}  人数：${record.participantCount}`
        )
        .addNewline()
        .addText(`时间：${formatGameTime(record.settledAt)}`)
    );
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '队伍战斗记录',
      content: md,
      nav: {
        current: result.data.currentPage,
        total: result.data.totalPages,
        count: result.data.total,
        command: '/队伍战斗记录 {page}'
      }
    })
  );
});
