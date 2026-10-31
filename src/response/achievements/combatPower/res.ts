import { formatNumber } from '@src/utils/formatHelper';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { achievementRecoveryTips, achievementProgressTips } from '@src/response/achievementRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 战力成就分类页
 * 指令：/成就 战力
 * 展示战力成就分类的总体情况、下一目标和可领取状态
 */
import App from '@src/response-apps/achievements/combatPower/app';
import claimResponse from '@src/response/achievements/claimCombatPower/res';
import { sendFifthLayerLockedPage } from '@src/response/access/fifthLayer';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui, type GuiButton } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  // The existing longer "成就 战力" route wins before the general dispatcher.
  // Preserve its documented claim subcommands without moving router entries.
  const text = String(e.MessageText ?? '')
    .replace(/^[!！/#＃]/u, '')
    .trim();

  if (/^成就\s+战力\s+(领取|一键领取)$/u.test(text)) {
    return claimResponse.current(e);
  }
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    const result = await App({ event: e, next });

    if (!result) {
      return;
    }
    if (result.code === 'LOCKED') {
      sendFifthLayerLockedPage({ bid, isPrivate, message, title: '战力成就', realmName: result.data.realmName });

      return;
    }
    const md = Format.createMarkdown();

    if (result.code === 'INVALID_USER') {
      md.addText('请先踏入仙途');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    if (result.code !== 'OK') {
      md.addText('查询战力成就失败，请稍后再试。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.combat-power', '查询战力成就失败，请稍后再试。'));

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    const { currentPower, totalCount, completedCount, claimableCount, currentClaimable, nextTarget, allCompleted, historicalUnclaimed } = result.data;

    if (totalCount === 0) {
      md.addText('暂无战力成就配置。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.combat-power', '暂无战力成就配置。'));

      void message.send(FormatGui({ isPrivate, bid, title: '战力成就', content: md }));

      return;
    }

    md.addText(`当前战力✊${formatNumber(currentPower)}`);
    md.addNewline();
    md.addText(`已达成：${completedCount} / ${totalCount}`);
    md.addNewline();
    md.addText(`待领取：${claimableCount}`);
    md.addNewline();
    md.addNewline();

    const footer: GuiButton[] = [];

    if (currentClaimable) {
      md.addBlockquote(
        createQuoteMarkdown(
          [
            `当前可领取 · ${currentClaimable.name}`,
            `目标战力✊${formatNumber(currentClaimable.threshold)}`,
            ...(currentClaimable.rewardText ? [`奖励：${currentClaimable.rewardText}`] : []),
            ...(currentClaimable.remainingClaimableCount > 0 ? [`另有 ${currentClaimable.remainingClaimableCount} 项待领取`] : [])
          ],
          [{ label: '一键领取', command: '/成就 战力 一键领取' }]
        )
      );
    } else if (allCompleted) {
      md.addText('🎉 所有战力成就已达成！');
    } else if (nextTarget) {
      md.addBlockquote(
        createQuoteMarkdown(
          [
            `下一目标 · ${nextTarget.name}`,
            `目标战力✊${formatNumber(nextTarget.threshold)}`,
            nextTarget.description ?? '',
            ...(nextTarget.rewardText ? [`奖励：${nextTarget.rewardText}`] : []),
            `还差：${formatNumber(nextTarget.remainingPower)} 战力`
          ].filter(Boolean)
        )
      );
    }

    if (historicalUnclaimed && !currentClaimable) {
      md.addNewline().addText('存在历史已达成但本页当前未显示可领取的记录，请核对成就状态。');
      if (currentClaimable || !nextTarget) {
        appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.combat-power', '历史记录待核对'));
      }
    }

    if (!currentClaimable && nextTarget) {
      appendMiddlewareAdvice(md, [
        ...achievementProgressTips('combat_power'),
        ...(historicalUnclaimed ? achievementRecoveryTips('achievements.combat-power', '历史记录待核对') : [])
      ]);
    }

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '战力成就',
        content: md,
        footer: footer.length > 0 ? footer : undefined
      })
    );
  } catch (error) {
    logger.error('查询战力成就失败:', error);
    const md = Format.createMarkdown();

    md.addText('查询战力成就失败，请稍后再试。');
    appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.combat-power', '查询战力成就失败，请稍后再试。'));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
