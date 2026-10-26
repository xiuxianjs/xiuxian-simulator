import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { popularityRecoveryTips, popularitySuccessTips } from '@src/response/popularityRecovery';
import { rankingFeedbackMarkdown } from '@src/response/leaderboard/view';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotPopularityLike } from '@src/api/bot/popularity-like';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { resolveRobotTargetFromArg } from '@src/utils/targetUid';
import { Format, onResponse, useMention, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = (e.MessageText ?? '').trim();
  const match = text.match(/^(?:!|！|\/|#|＃)?点赞人气\s+(\S+)\s+([A-Za-z]+)$/);

  if (!match) {
    const md = Format.createMarkdown().addText('请从榜单选择要点赞的道友。');

    appendMiddlewareAdvice(md, popularityRecoveryTips('popularity.like', '参数不完整'));
    await message.send(FormatGui({ isPrivate, bid, title: '人气点赞', content: md }));

    return;
  }

  const [, next] = useEvent();
  let response;

  try {
    const target = await resolveRobotTargetFromArg(match[1], mention);

    response = await runRobotBusiness(
      e,
      'popularity.like',
      { target, boardType: match[2] },
      parseRobotPopularityLike,
      next,
      adviceRenderer(async reply => {
        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: '人气点赞',
            header: [{ label: '人气榜', command: '/人气排行榜' }],
            content: rankingFeedbackMarkdown(reply),
            footer: reply.buttons.length ? reply.buttons : undefined
          })
        );
      })
    );
  } catch {
    const md = Format.createMarkdown().addText('点赞结果未获完整确认，请先核对当前状态。');

    appendMiddlewareAdvice(md, popularityRecoveryTips('popularity.like', '结果未确认'));
    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '人气点赞',
        header: [{ label: '人气榜', command: '/人气排行榜' }],
        content: md
      })
    );

    return;
  }
  if (response.handled) {
    return;
  }
  if (response.data.outcome === 'ignored') {
    const md = Format.createMarkdown().addText('未能定位可点赞的道友，请从当前榜单选择目标。');

    appendMiddlewareAdvice(md, popularityRecoveryTips('popularity.like', '未能定位'));
    await message.send(FormatGui({ isPrivate, bid, title: '人气点赞', content: md }));

    return;
  }
  const result = { data: { ...response.data, success: true } };
  const md = Format.createMarkdown();
  const displayMsg = result.data.message;

  md.addText(displayMsg);

  if (result.data.success) {
    md.addNewline();
    md.addText(`当前人气：${result.data.currentPopularity ?? 0}`).addNewline();

    md.addText(`今日剩余点赞：${result.data.remainingLikes ?? 0}次`);
  }

  appendMiddlewareAdvice(md, popularitySuccessTips(result.data.remainingLikes));

  const header = [{ label: '人气榜', command: '/人气排行榜' }];
  const boardLabel = result.data.boardLabel;

  if (boardLabel) {
    header.push({ label: `${boardLabel} `, command: `/${boardLabel}` });
  }

  void message.send(FormatGui({ isPrivate, bid, title: '人气点赞', content: md, header }));
});
