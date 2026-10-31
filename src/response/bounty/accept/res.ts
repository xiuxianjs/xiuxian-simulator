import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { appendTreasureEffects } from '@src/response/treasureEffects';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { bountyRecoveryTips } from '@src/response/bountyRecovery';
import { BattleFormatGui } from '@src/utils/battleMemoryMessage';
import { useMessage } from '@src/utils/useMessage';
/**
 * 接赏
 * 指令：/接赏 悬赏ID
 *
 * 对悬赏目标发起 PvP 战斗，胜利后可领赏
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendBountyAccept } from '@src/api/bot/bounty-actions';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { selects } from '@src/response/config';
import type { GuiButton } from '@src/utils/messageHelper';
import { FormatGui } from '@src/utils/messageHelper';
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

  const match = text.match(/^(?:!|！|\/|#|＃)?接赏\s+(\d+)$/);

  const [, next] = useEvent();
  const bountyId = match ? parseInt(match[1], 10) : null;
  const sendFailure = async (text: string, reply?: RobotMiddlewareReply) => {
    const md = Format.createMarkdown().addText(text);

    if (reply?.quote) {
      md.addBlockquote(Format.createMarkdown().addText(reply.quote));
    }
    appendMiddlewareBlocks(
      md,
      reply?.blocks?.filter(block => block.text !== text || block.inlineButtons?.length)
    );
    appendMiddlewareAdvice(md, reply?.advice ?? bountyRecoveryTips('bounty.accept', text));

    if (reply?.buttons.length) {
      md.addNewline();
      for (const button of reply.buttons) {
        md.addButton(markdownButtonLabel(button.label), { data: button.command });
      }
    }
    await message.send(FormatGui({ isPrivate, bid, title: '接赏', content: md, header: bountyHeader, footer: bountyFooter }));
  };
  let result;

  try {
    result = await runRobotBusiness(
      e,
      'bounty.accept',
      { bountyId: bountyId === null ? null : String(bountyId) },
      parseBackendBountyAccept,
      next,
      adviceRenderer(async reply => {
        await sendFailure(reply.text, reply);
      })
    );
  } catch {
    await sendFailure('接赏结果未获完整确认，请先核对已有战斗与待领状态。');

    return;
  }
  if (result.handled) {
    return;
  }

  const d = result.data;
  const experience = d.normalExperienceGained ?? d.expReward;
  const md = Format.createMarkdown();

  if (d.battleWon && d.completionId) {
    const br = d.battleResult;
    const sideACount = br.finalState.sideA.length;
    const sideBCount = br.finalState.sideB.length;

    md.addText(`目标：${d.targetName ?? '未知'}`);
    md.addNewline();
    md.addText('胜负：✅ 接赏成功');
    md.addNewline();
    md.addBlockquote(
      Format.createMarkdown()
        .addText(`战斗类型：${sideACount}v${sideBCount}，回合数：${br.totalRounds}`)
        .addNewline()
        .addText(`消耗元力：${d.qiCost}，今日剩余：${d.remainingCount}/${d.dailyAcceptLimit}`)
    );

    const loot: string[] = [];

    if (d.stoneReward) {
      loot.push(`灵石+${d.stoneReward}`);
    }
    if (d.crystalReward) {
      loot.push(`灵晶+${d.crystalReward}`);
    }
    if (loot.length > 0) {
      md.addText(`💰 ${loot.join(',')}`);
      md.addNewline();
    }

    if (d.bonusText) {
      md.addBlockquote(Format.createMarkdown().addText(d.bonusText));
    }

    if (d.droppedItem) {
      md.addText(`🎁 掉落：${d.droppedItem.name}×${d.droppedItem.quantity}（${d.droppedItem.category}）`);
      md.addNewline();
    }

    if (d.normalExperienceGained !== undefined || experience > 0) {
      md.addText(`📖 获得修为：+${experience}`);
      md.addNewline();
    }

    md.addNewline();
    md.addBlockquote(
      Format.createMarkdown()
        .addText('赏金待领取 ')
        .addButton(markdownButtonLabel('领赏'), { data: `/领赏 ${bountyId}` })
    );
  } else if (d.battleWon && !d.completionId) {
    md.addText('战斗胜利，但名额已满');
    md.addNewline();
    md.addNewline();
    md.addText('其他猎人抢先完成，元力已退还');
    appendMiddlewareAdvice(md, bountyRecoveryTips('bounty.accept', '名额已被其他猎人抢占'));
  } else {
    const br = d.battleResult;
    const sideACount = br?.finalState.sideA.length ?? 1;
    const sideBCount = br?.finalState.sideB.length ?? 1;

    md.addText(`目标：${d.targetName ?? '未知'}`);
    md.addNewline();
    md.addText('胜负：❌ 接赏失败');
    md.addNewline();
    md.addBlockquote(
      Format.createMarkdown()
        .addText(`战斗类型：${sideACount}v${sideBCount}，回合数：${br?.totalRounds ?? 0}`)
        .addNewline()
        .addText(`消耗元力：${d.qiCost}，今日剩余：${d.remainingCount}/${d.dailyAcceptLimit}`)
    );

    if (d.normalExperienceGained !== undefined || experience > 0) {
      md.addText(`📖 获得修为：+${experience}`);
      md.addNewline();
    }

    if (d.losingStreakText) {
      md.addText(d.losingStreakText);
      md.addNewline();
    }
  }

  appendTreasureEffects(md, d.treasureEffects);
  if (!d.battleWon) {
    appendMiddlewareAdvice(md, bountyRecoveryTips('bounty.accept', '接赏战败'));
  }

  const footer: GuiButton[] = [];

  if (d.logId) {
    footer.push({ label: '文字记录', command: `/查看战斗过程 ${d.logId}` });
  }
  footer.push({ label: '打劫记录', command: '/打劫记录' });
  footer.push({ label: '悬赏榜', command: '/悬赏榜' });

  void message.send(
    await BattleFormatGui(
      {
        isPrivate,
        bid,
        title: '接赏',
        header: bountyHeader,
        content: md,
        footer
      },
      [{ id: d.logId }]
    )
  );
});
