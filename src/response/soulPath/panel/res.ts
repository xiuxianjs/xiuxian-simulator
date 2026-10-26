import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { withoutSoulConfirmationActions } from '@src/response/soulPathRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseSoulPathState } from '@src/api/bot/soul-path';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { sendSoulGui, addSoulQuote } from '@src/response/soulPath/shared';
import type { GuiFooter } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const md = Format.createMarkdown();

  const [, parentNext] = useEvent();
  const sendFailure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('soul-path.state', withoutSoulConfirmationActions({ ...reply, title: reply.title || '元婴·神魂' })), 'footer')
  );
  const result = await runRobotBusiness(e, 'soul-path.state', {}, parseSoulPathState, parentNext, sendFailure).catch(async error => {
    logger.error('[元婴神魂] 面板加载失败:', error);
    await sendFailure({
      title: '',
      heading: '',
      text: '神魂查询结果未获完整确认，请核对当前状态，稍后重新查看；不据此判断道途或材料已消失。',
      buttons: [],
      advice: []
    });

    return { handled: true as const };
  });

  if (result.handled) {
    return;
  }

  const state = result.data;
  const panel = state.panel;
  const nextNode = panel.nextNode;

  md.addBold(state.pathName ? `${state.pathName} · ${panel.pathStage}` : '尚未立道');
  md.addNewline();
  addSoulQuote(md, `稳定 ${state.stability}/100 · 感悟 ${state.insight} · 熟练 ${state.pathProficiency}`);
  md.addText(panel.dailyNurtureText);
  md.addNewline();
  if (state.lowYieldStreak > 0) {
    addSoulQuote(md, `连续低收益 ${state.lowYieldStreak} 次`);
  }
  if (state.effectsMaintenance) {
    addSoulQuote(md, '维护中：道途战斗加成暂停。');
  }
  md.addNewline();
  md.addBold('已有材料');
  md.addNewline();
  addSoulQuote(md, panel.materials.map(material => `${material.name}×${material.quantity}`).join('  '));
  addSoulQuote(md, `秘境日奖励：${panel.dailyDungeonClaimed ? '今日已领' : '立道后，今日首次成功结算元婴秘境可领一份温养材料'}`);
  md.addBlockquote(
    Format.createMarkdown()
      .addText(`补给方向：${panel.dailyMaterialDirectionName} `)
      .addButton(markdownButtonLabel('调整补给'), { data: '/神魂补给' })
      .addText(' ')
      .addButton(markdownButtonLabel('材料来源与温养规则'), { data: '/神魂材料来源' })
  );
  md.addNewline();

  if (!state.pathKey) {
    md.addNewline();
    addSoulQuote(md, '首次立道免费，选定后即可温养。');
  } else {
    md.addNewline();
    if (nextNode) {
      md.addBold(`下一步 · ${nextNode.name}`);
      if (nextNode.canAdvance) {
        md.addText(' ');
        md.addButton(markdownButtonLabel('道途突破'), { data: '/道途突破' });
      }
      md.addNewline();
      addSoulQuote(md, nextNode.requirementText);
    }
    if (panel.canReroll) {
      addSoulQuote(md, '本次温养可免费重选。');
    }
  }

  if (panel.actionUnavailable) {
    md.addNewline();
    addSoulQuote(md, panel.nurtureUnavailable ? panel.actionUnavailable : '温养神魂，稳固道途。');
  }
  if (state.pathKey && !panel.nurtureUnavailable) {
    md.addNewline();
    md.addText('请选择：');
    md.addNewline();
    for (const option of panel.nurtureOptions) {
      const quote = Format.createMarkdown()
        .addText(`${option.costText} `)
        .addButton(markdownButtonLabel(`${option.name}`), { data: `/神魂温养 ${option.name}` });

      if (option.reserveWarning) {
        quote.addNewline().addText(option.reserveWarning);
      }
      quote.addNewline().addText(option.baseText);
      md.addBlockquote(quote);
    }
  }
  const footer: GuiFooter = panel.actionUnavailable
    ? [{ label: '道途', command: '/元婴道途' }]
    : state.pathKey
      ? [
          [
            { label: '元婴道途', command: '/元婴道途' },
            { label: '道途印证', command: '/道途印证' }
          ]
        ]
      : [
          { label: '玄法', command: '/选择道途 玄法' },
          { label: '炼体', command: '/选择道途 炼体' },
          { label: '御器', command: '/选择道途 御器' }
        ];

  if (panel.nurtureUnavailable || panel.actionUnavailable) {
    appendMiddlewareAdvice(
      md,
      withBusinessRecovery('soul-path.nurture', { title: '', heading: '', text: panel.nurtureUnavailable || panel.actionUnavailable, buttons: [], advice: [] })
        .advice
    );
  }
  await message.send(sendSoulGui(e, '元婴·神魂', md, footer));
});
