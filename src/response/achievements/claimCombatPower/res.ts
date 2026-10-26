import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { achievementRecoveryTips } from '@src/response/achievementRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 领取战力成就
 * 指令：/成就 战力 领取、/成就 战力 一键领取
 */
import App from '@src/response-apps/achievements/claimCombatPower/app';
import { sendFifthLayerLockedPage } from '@src/response/access/fifthLayer';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
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

    if (result.code === 'NO_CLAIMABLE') {
      md.addText('当前没有可领取的战力成就，请核对当前进度与领取状态。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.claim-combat-power', '没有可领取'));

      void message.send(FormatGui({ isPrivate, bid, title: '战力成就', content: md }));

      return;
    }

    if (result.code !== 'OK') {
      md.addText('成就领取结果未获完整确认，请先核对进度和奖励。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.claim-combat-power', '领取战力成就失败，请稍后再试。'));

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    md.addBold(`成功领取 ${result.data.claimedCount} 个战力成就奖励`);
    md.addNewline();

    for (const item of result.data.claimed) {
      md.addBlockquote(Format.createMarkdown().addText(`${item.achievementName}`));

      if (item.rewardText) {
        md.addBlockquote(Format.createMarkdown().addText(`获得：${item.rewardText}`));
      }
    }

    md.addButton(markdownButtonLabel('战力成就'), { data: '/成就 战力' });

    void message.send(FormatGui({ isPrivate, bid, title: '战力成就', content: md }));
  } catch (error) {
    logger.error('领取战力成就失败:', error);
    const md = Format.createMarkdown();

    md.addText('成就领取结果未获完整确认，请先核对进度和奖励。');
    appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.claim-combat-power', '领取战力成就失败，请稍后再试。'));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
