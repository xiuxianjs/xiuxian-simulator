import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { appendTreasureEffects } from '@src/response/treasureEffects';
import { Format, onResponse, useEvent } from 'alemonjs';
import { useMessage } from '@src/utils/useMessage';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotBountyChallenge } from '@src/api/bot/bounty-actions';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { bountyRecoveryTips } from '@src/response/bountyRecovery';
import { BattleFormatGui } from '@src/utils/battleMemoryMessage';
import { FormatGui } from '@src/utils/messageHelper';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';

/** Explicitly continue an existing accepted bounty; never auto-accept or replay. */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const match = (e.MessageText ?? '').trim().match(/^(?:!|！|\/|#|＃)?继续接赏\s+(\d+)$/);
  const bountyId = match?.[1] ?? null;
  const header = [
    { label: '悬赏榜', command: '/悬赏榜' },
    { label: '待领赏金', command: '/领赏' }
  ];
  const failure = adviceRenderer(async (reply: RobotMiddlewareReply) => {
    const md = Format.createMarkdown().addText(reply.text);

    if (reply.quote) {
      md.addBlockquote(Format.createMarkdown().addText(reply.quote));
    }
    appendMiddlewareBlocks(
      md,
      reply.blocks?.filter(block => block.text !== reply.text || block.inlineButtons?.length)
    );
    appendMiddlewareAdvice(md, reply.advice);
    await message.send(FormatGui({ bid, isPrivate, title: '继续接赏', header, content: md, footer: reply.buttons.length ? reply.buttons : undefined }));
  });
  const response = await runRobotBusiness(e, 'bounty.accept', { bountyId, continueBattle: true }, parseRobotBountyChallenge, next, failure).catch(async () => {
    await failure({
      title: '',
      heading: '',
      text: '续战结果未获完整确认，请先核对已有战斗、待领状态和本人资产。',
      buttons: [],
      advice: bountyRecoveryTips('bounty.accept', '结果未确认')
    });

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }
  const data = response.data;
  const md = Format.createMarkdown().addText(`悬赏编号：#${bountyId}`);

  md.addNewline().addText(data.won ? '胜负：✅ 续战成功' : '胜负：❌ 续战失败');
  md.addNewline().addBlockquote(
    Format.createMarkdown()
      .addText(`战斗类型：${data.battle.sideA.length}v${data.battle.sideB.length}，回合数：${data.battle.rounds}`)
      .addNewline()
      .addText(`消耗元力：${data.qiCost}，今日剩余：${data.remainingCount}/${data.dailyAcceptLimit}`)
  );
  const experience = data.normalExperienceGained ?? data.experienceGained;

  if (data.normalExperienceGained !== undefined || experience > 0) {
    md.addNewline().addText(`📖 获得修为：+${experience}`);
  }
  if (data.won && data.rewardAmount > 0) {
    md.addNewline().addBlockquote(
      Format.createMarkdown()
        .addText(`赏金待领取：${data.rewardAmount} 灵晶 `)
        .addButton(markdownButtonLabel('领赏'), { data: `/领赏 ${bountyId}` })
    );
  } else if (data.won) {
    md.addNewline().addText('本次未返回有效赏金金额，请先核对待领记录与原战斗回执。');
    appendMiddlewareAdvice(md, bountyRecoveryTips('bounty.claim', '赏金金额异常'));
  } else {
    appendMiddlewareAdvice(md, bountyRecoveryTips('bounty.accept', '接赏战败'));
  }
  appendTreasureEffects(md, data.treasureEffects);
  await message.send(
    await BattleFormatGui(
      {
        bid,
        isPrivate,
        title: '继续接赏',
        header,
        content: md,
        footer: [{ label: '打劫记录', command: '/打劫记录' }, ...(data.logId ? [{ label: '文字记录', command: `/查看战斗过程 ${data.logId}` }] : [])]
      },
      [{ id: data.logId }]
    )
  );
});
