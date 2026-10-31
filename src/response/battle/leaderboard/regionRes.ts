import { formatNumber } from '@src/utils/formatHelper';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { leaderboardRecoveryTips } from '@src/response/leaderboardRecovery';
import { formatGameTime } from '@src/utils/gameTime';
import { rankingView, rankingSelfText, rankingFeedbackMarkdown, rankingFailureMarkdown } from '@src/response/leaderboard/view';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotBattleLeaderboard } from '@src/api/bot/battle-leaderboard-queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  let response;

  try {
    response = await runRobotBusiness(
      e,
      'leaderboard.battle-region',
      { page: String(rankingView(e.MessageText ?? '').page), top50: true },
      parseRobotBattleLeaderboard,
      next,
      adviceRenderer(async reply => {
        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: reply.title,
            content: rankingFeedbackMarkdown(reply),
            footer: reply.buttons.length ? reply.buttons : undefined
          })
        );
      })
    );
  } catch {
    void message.send(
      FormatGui({ isPrivate, bid, title: '区战力排行榜', content: rankingFailureMarkdown('leaderboard.battle-region', '查看战力排行榜失败，请稍后再试') })
    );

    return;
  }
  if (response.handled) {
    return;
  }
  const result = { data: response.data };
  const currentUid = e.uid as number;
  const { time, totalPages, total } = result.data;

  const list = result.data.list.filter(row => row.rank <= 50).slice(0, 10);
  const md = Format.createMarkdown();

  if (time) {
    md.addText(`统计时间：${formatGameTime(time)}`);
  } else {
    md.addText(result.data.building ? '统计时间：暂无（首次统计中）' : '统计时间：暂无');
  }
  md.addNewline();
  if (result.data.building) {
    md.addText('榜单更新中');
    md.addNewline();
  }
  const selfText = rankingSelfText(result.data.self);

  if (selfText) {
    md.addText(selfText);
    md.addNewline();
  }
  if (list.length === 0) {
    md.addText(
      result.data.building ? '当前区内暂无榜单数据，正在统计中，请稍后查看' : total > 0 ? `本页暂无榜单记录，当前榜单共 ${total} 人` : '当前暂无榜单数据'
    );
    appendMiddlewareAdvice(
      md,
      leaderboardRecoveryTips('leaderboard.battle-region', result.data.building ? '榜单更新中' : total > 0 ? '本页无记录' : '暂无排行数据')
    );
  }
  for (const item of list) {
    const buttons: { label: string; command: string }[] = [{ label: '查看', command: `/查看信息 ${item.uid}` }];

    if (result.data.canUseSpar && currentUid !== item.uid) {
      buttons.push({ label: '比试', command: `/比试 ${item.uid}` });
    }
    if (currentUid && currentUid !== item.uid) {
      buttons.push({ label: '点赞', command: `/点赞人气 ${item.uid} regionBattle` });
    }
    md.addBlockquote(createQuoteMarkdown([`【${item.rank}】${item.name ?? '未知玩家'}`, `ID:${item.uid} 战力✊${formatNumber(item.power)}`], buttons));
  }
  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '区战力排行榜',
      content: md,
      header: [
        { label: '全服', command: '/战力排行榜' },
        { label: '本区', selected: true, command: '/区战力排行榜' }
      ],

      nav: totalPages > 1 ? { current: result.data.page, total: totalPages, count: total, command: '/区战力排行榜 {page}' } : undefined
    })
  );
});
