import { withBusinessRecovery } from '@src/response/businessRecovery';
import { soulPathRecoveryTips } from '@src/response/soulPathRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { parseSoulNurture } from '@src/api/bot/soul-path';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { getCommandArgument, sendSoulGui } from '@src/response/soulPath/shared';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, parentNext] = useEvent();
  const navigation = [
    { label: '神魂面板', command: '/元婴神魂' },
    { label: '定魂', command: '/神魂温养 定魂' },
    { label: '养魄', command: '/神魂温养 养魄' },
    { label: '悟道', command: '/神魂温养 悟道' },
    { label: '出窍', command: '/神魂温养 出窍' }
  ];
  const sendFailure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('soul-path.nurture', { ...reply, title: reply.title || '神魂温养' }), 'footer')
  );
  const result = await runRobotBusiness(
    e,
    'soul-path.nurture',
    { input: getCommandArgument(e.MessageText, '神魂温养') },
    value => {
      const data = parseSoulNurture(value);

      if (
        !Number.isSafeInteger(data.dailyNurtureCount) ||
        data.dailyNurtureCount < 1 ||
        !Number.isSafeInteger(data.dailyNurtureLimit) ||
        data.dailyNurtureLimit < 1
      ) {
        throw new Error('温养次数回执无效');
      }

      return data;
    },
    parentNext,
    sendFailure
  ).catch(async error => {
    logger.error('[神魂温养] 执行失败:', error);
    await sendFailure({ title: '', heading: '', text: '神魂温养结果未获完整确认，请先核对当前次数、材料与原回执。', buttons: [], advice: [] });

    return { handled: true as const };
  });

  if (result.handled) {
    return;
  }
  const md = Format.createMarkdown();

  {
    const { data } = result;

    md.addBold(`${data.directionName} · ${data.tierName}`);
    md.addNewline();
    md.addText(`稳定 ${data.stabilityBefore} → ${data.stabilityAfter}`);
    md.addNewline();
    md.addText(`感悟 +${data.insightGained} · 熟练 +${data.proficiencyGained}`);
    md.addNewline();
    if (data.extraItems.length > 0) {
      md.addText(`额外收获：${data.extraItems.map(item => `${item.name}×${item.quantity}`).join('、')}`);
      md.addNewline();
    }
    md.addBlockquote(Format.createMarkdown().addText(data.dailyNurtureProgressText));
    if (data.rerollable) {
      md.addBlockquote(Format.createMarkdown().addText('可免费重选；请保留本次额外材料。'));
    }
  }

  const reachedBaseLimit = result.data.dailyNurtureCount >= result.data.dailyNurtureLimit;

  if (reachedBaseLimit) {
    appendMiddlewareAdvice(md, soulPathRecoveryTips('soul-path.nurture', '基础次数已用尽'));
  }

  void message.send(
    sendSoulGui(e, '神魂温养', md, [
      { label: '神魂面板', command: '/元婴神魂' },
      ...(result.data.rerollable ? [{ label: '重选', command: '/神魂重选' }] : []),
      ...(reachedBaseLimit ? [{ label: '材料与次数规则', command: '/神魂材料来源' }] : navigation.slice(1))
    ])
  );
});
