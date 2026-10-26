import { markdownButtonLabel } from '@src/utils/buttonLabel';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { bountyRecoveryTips } from '@src/response/bountyRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 领赏
 * 指令：/领赏 悬赏ID
 *
 * 领取已完成悬赏的赏金
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotBountyClaim } from '@src/api/bot/bounty-actions';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

const bountyActionHeader = [
  { label: '悬赏榜', command: '/悬赏榜' },
  { label: '杀神榜', command: '/杀神榜' }
];

const bountyActionFooter = [
  { label: '记录', command: '/打劫记录' },
  { label: '悬赏', command: '/悬赏' },
  { label: '仇人', command: '/仇人' },
  { label: '煞气', command: '/煞气' }
];

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const text = (e.MessageText ?? '').trim();

  const match = text.match(/^(?:!|！|\/|#|＃)?领赏(?:\s+(\d+))?$/);

  const bountyId = match?.[1] ? parseInt(match[1], 10) : null;
  const sendFailure = async (text: string, reply?: RobotMiddlewareReply) => {
    const md = Format.createMarkdown().addText(text);

    if (reply?.quote) {
      md.addBlockquote(Format.createMarkdown().addText(reply.quote));
    }
    appendMiddlewareBlocks(
      md,
      reply?.blocks?.filter(block => block.text !== text || block.inlineButtons?.length)
    );
    appendMiddlewareAdvice(md, reply?.advice ?? bountyRecoveryTips('bounty.claim', text));

    await message.send(
      FormatGui({ isPrivate, bid, title: '领赏', content: md, header: bountyActionHeader, footer: reply?.buttons.length ? reply.buttons : bountyActionFooter })
    );
  };
  let result;

  try {
    result = await runRobotBusiness(
      e,
      'bounty.claim',
      { mode: !match ? 'usage' : bountyId === null ? 'list' : 'claim', bountyId: bountyId === null ? null : String(bountyId) },
      parseRobotBountyClaim,
      next,
      adviceRenderer(async reply => {
        await sendFailure(reply.text, reply);
      })
    );
  } catch {
    await sendFailure('领赏结果未获完整确认，请先核对待领记录和本人资产。');

    return;
  }
  if (result.handled) {
    return;
  }

  const md = Format.createMarkdown();

  switch (result.data.outcome) {
    case 'list': {
      const { pending } = result.data;

      if (pending.length === 0) {
        md.addText('暂无待领取的赏金');
        appendMiddlewareAdvice(md, bountyRecoveryTips('bounty.claim', '暂无待领取'));
        md.addNewline();

        md.addButton(markdownButtonLabel('悬赏榜'), { data: '/悬赏榜' });
      } else {
        md.addText('待领赏金');
        md.addNewline();

        for (const p of pending) {
          md.addBlockquote(
            Format.createMarkdown()
              .addText(`#${p.bountyId} ${p.targetName} · ${p.rewardAmount}灵晶 `)
              .addButton(markdownButtonLabel('领赏'), { data: `/领赏 ${p.bountyId}` })
          );
        }
      }
      break;
    }
    case 'claimed':
      md.addText('领赏成功！');
      md.addNewline();
      md.addNewline();
      md.addText(`获得灵晶：${result.data.rewardAmount}`);
      break;
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '领赏',
      content: md,
      header: bountyActionHeader,
      footer: bountyActionFooter
    })
  );
});
