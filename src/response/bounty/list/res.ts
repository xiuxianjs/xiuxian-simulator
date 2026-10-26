import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { bountyRecoveryTips } from '@src/response/bountyRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 悬赏榜
 * 指令：/悬赏榜
 *
 * 展示当前活跃的悬赏列表
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotBountyList } from '@src/api/bot/bounty-queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
const bountyHeader = [
  { label: '悬赏榜', command: '/悬赏榜' },
  { label: '杀神榜', command: '/杀神榜' }
];

const bountyFooter = [
  { label: '记录', command: '/打劫记录' },
  { label: '悬赏', command: '/悬赏' },
  { label: '仇人', command: '/仇人' },
  { label: '煞气', command: '/煞气' }
];

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const text = (e.MessageText ?? '').trim();

  const pageMatch = text.match(/(?:悬赏榜)\s*(\d+)?$/);
  const page = pageMatch?.[1] ? parseInt(pageMatch[1], 10) : 1;

  const [, next] = useEvent();
  const sendFailure = async (text: string, reply?: RobotMiddlewareReply) => {
    const md = Format.createMarkdown().addText(text);

    if (reply?.quote) {
      md.addBlockquote(Format.createMarkdown().addText(reply.quote));
    }
    appendMiddlewareBlocks(
      md,
      reply?.blocks?.filter(block => block.text !== text || block.inlineButtons?.length)
    );
    appendMiddlewareAdvice(md, reply?.advice ?? bountyRecoveryTips('bounty.list', text));

    await message.send(
      FormatGui({ isPrivate, bid, title: '悬赏榜', content: md, header: bountyHeader, footer: reply?.buttons.length ? reply.buttons : bountyFooter })
    );
  };
  let result;

  try {
    result = await runRobotBusiness(
      e,
      'bounty.list',
      { page: String(Number.isFinite(page) && page >= 1 ? page : 1) },
      parseRobotBountyList,
      next,
      adviceRenderer(async reply => {
        await sendFailure(reply.text, reply);
      })
    );
  } catch {
    await sendFailure('悬赏榜加载失败，请稍后再试');

    return;
  }
  if (result.handled) {
    return;
  }
  const { list, total, totalPages } = result.data;

  const md = Format.createMarkdown();

  if (list.length === 0) {
    md.addText(total > 0 ? `本页暂无悬赏，当前共有 ${total} 条活跃记录` : '当前没有进行中的悬赏');
    appendMiddlewareAdvice(md, bountyRecoveryTips('bounty.list', total > 0 ? '本页无记录' : '当前没有进行中的悬赏'));
    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '悬赏榜',
        content: md,
        header: bountyHeader,
        footer: bountyFooter
      })
    );

    return;
  }

  for (const b of list) {
    md.addNewline();
    md.addBlockquote(
      createQuoteMarkdown(
        [`悬赏 #${b.id} · ${b.targetName}`, `赏金：${b.rewardPerCompletion}灵晶/人 · 剩余${b.remainingSlots}/${b.maxCompletions}人 · 剩余${b.hoursLeft}小时`],
        [
          { label: '查看', command: `/查看信息 ${b.targetUid}` },
          { label: '接赏', command: `/接赏 ${b.id}` }
        ]
      )
    );
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '悬赏榜',
      content: md,
      nav:
        totalPages > 1
          ? {
              current: result.data.page,
              total: totalPages,
              count: total,
              command: '/悬赏榜 {page}'
            }
          : undefined,
      header: bountyHeader,
      footer: bountyFooter
    })
  );
});
