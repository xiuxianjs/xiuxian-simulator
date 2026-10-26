import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { leaderboardRecoveryTips } from '@src/response/leaderboardRecovery';
import { rankingView, rankingSelfText, rankingFeedbackMarkdown, rankingFailureMarkdown } from '@src/response/leaderboard/view';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotPopularity } from '@src/api/bot/popularity-queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const msg = e.MessageText ?? '';
  const [, next] = useEvent();
  let response;

  try {
    response = await runRobotBusiness(
      e,
      'leaderboard.popularity',
      {},
      parseRobotPopularity,
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
      FormatGui({ isPrivate, bid, title: '人气排行榜', content: rankingFailureMarkdown('leaderboard.popularity', '查看人气排行榜失败，请稍后再试') })
    );

    return;
  }
  if (response.handled) {
    return;
  }
  const result = { data: response.data };

  const match = msg.match(/^(!|！|\/|#|＃)?人气排行榜(?:\s*(\d+|榜首|附近|我的))?$/);

  const pageRaw = match?.[2];
  let page = pageRaw ? Number(pageRaw) : 1;

  if (!Number.isFinite(page) || page < 1) {
    page = 1;
  }

  const list = result.data.list.filter(row => row.rank <= 50).slice(0, 50);
  const view = rankingView(msg);
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / 10));

  page = Math.min(view.page, totalPages);
  const slice = list.slice((page - 1) * 10, page * 10);

  const md = Format.createMarkdown();

  const selfText = rankingSelfText(result.data.self);

  if (selfText) {
    md.addText(selfText);
    md.addNewline();
  }

  if (slice.length === 0) {
    md.addText('暂无人气排行数据');
    appendMiddlewareAdvice(md, leaderboardRecoveryTips('leaderboard.popularity', '暂无排行数据'));
  } else {
    for (const item of slice) {
      const icon = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `【${item.rank}】`;

      md.addBlockquote(
        createQuoteMarkdown([`${icon} ${item.name}`, `ID:${item.uid} 人气：${item.popularity}`], [{ label: '查看', command: `/查看信息 ${item.uid}` }])
      );
    }
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '人气排行榜',
      content: md,

      nav:
        totalPages > 1
          ? {
              current: page,
              total: totalPages,
              count: total,
              command: '/人气排行榜 {page}'
            }
          : undefined
    })
  );
});
