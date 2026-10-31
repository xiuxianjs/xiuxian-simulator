import { exactInteger } from '@src/api/core/exact-json';
import { formatNumber } from '@src/utils/formatHelper';
import { formatGameTime } from '@src/utils/gameTime';
import { BattleFormatGui } from '@src/utils/battleMemoryMessage';
import { useMessage } from '@src/utils/useMessage';
import type { TeamBattleDetailResult } from '@src/response-apps/team/battleDetail/app';
import { parseBackendTeamBattleDetail } from '@src/api/bot/queries';
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
  const match = (e.MessageText ?? '').match(/^(!|！|\/|#|＃)?队伍战斗详情\s+(\d+)$/);

  let result: TeamBattleDetailResult;

  try {
    const recordID = Number(match?.[2] ?? 0);
    const loaded = await runRobotBusiness(
      e,
      'teams.battle-detail',
      { recordId: recordID.toString() },
      (value): TeamBattleDetailResult => {
        if (value && typeof value === 'object') {
          if ('found' in value && value.found === false) {
            return { code: 'NOT_FOUND' };
          }
          if ('error' in value && typeof value.error === 'string') {
            return { code: 'LOAD_FAILED', data: { message: value.error } };
          }
        }

        return { code: 'OK', data: parseBackendTeamBattleDetail(value, recordID) };
      },
      next
    );

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch (error) {
    logger.error('查询队伍战斗详情失败:', error);
    result = { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '查询失败' } };
  }
  const md = Format.createMarkdown();

  if (result.code === 'NOT_FOUND') {
    md.addText('记录不存在');
    appendMiddlewareAdvice(md, teamRecoveryTips('teams.battle-detail', '记录不存在'));
  } else if (result.code === 'LOAD_FAILED') {
    md.addText(result.data.message);
    appendMiddlewareAdvice(md, teamRecoveryTips('teams.battle-detail', result.data.message));
  } else {
    const d = result.data;

    md.addText(`记录ID：${d.id}`);
    md.addNewline();
    md.addText(`队伍ID：${d.teamId}`);
    md.addNewline();
    md.addText(`目标：${d.targetLabel}`);
    md.addNewline();
    md.addText(`结果：${d.battleResult === 'win' ? '胜利' : d.battleResult === 'lose' ? '失败' : '逃跑'}`);
    md.addNewline();
    md.addText(`参战人数：${d.participantCount}`);
    md.addNewline();
    md.addText(`时间：${formatGameTime(d.settledAt)}`);
    md.addNewline();
    md.addNewline();
    md.addBold('【成员列表】');

    for (const member of d.members) {
      const reward = member.rewardSnapshot;
      const rewardText =
        reward && (exactInteger(reward.expGained ?? 0) > 0 || exactInteger(reward.spiritStoneGained ?? 0) > 0 || exactInteger(reward.spiritCostPaid ?? 0) > 0)
          ? [
              ` · 修为+${formatNumber(exactInteger(reward.expGained ?? 0))}`,
              ` · 灵石+${formatNumber(exactInteger(reward.spiritStoneGained ?? 0))}`,
              ` · 精力${formatNumber(exactInteger(reward.spiritCostPaid ?? 0))}`
            ].join('')
          : '';

      md.addNewline();
      md.addText(`位置${member.position} ${member.userName}${member.isLeader ? '（队长）' : ''}${rewardText}`);
    }

    const footer = d.battleLogId ? [{ label: '文字记录', command: `/查看战斗过程 ${d.battleLogId}` }] : undefined;

    void message.send(await BattleFormatGui({ isPrivate, bid, title: '队伍战斗详情', content: md, footer }, [{ id: d.battleLogId }]));

    return;
  }

  void message.send(FormatGui({ isPrivate, bid, title: '队伍战斗详情', content: md }));
});
